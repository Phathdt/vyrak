import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { customInstance, getErrorMessage } from '@/api/client'
import {
  getWorkflowBrainstormingControllerGetBrainstormSessionQueryKey,
  useWorkflowBrainstormingControllerBrainstorm,
  useWorkflowBrainstormingControllerClassify,
  useWorkflowBrainstormingControllerGetBrainstormSession,
} from '@/api/generated/workflows-brainstorming/workflows-brainstorming'
import {
  getWorkflowsControllerFindOneQueryKey,
  useWorkflowsControllerApprovePhase,
  useWorkflowsControllerConfirmClassification,
  useWorkflowsControllerFindOne,
} from '@/api/generated/workflows/workflows'
import { ChatMarkdown } from '@/components/chat-markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { PhaseAutomationPanel } from '@/components/workflows/phase-automation-panel'
import { PlanningWorkspace } from '@/components/workflows/planning-workspace'
import { routes } from '@/lib/routes'

import type { ClassifyResponseDto } from '@/api/generated/models'

const STORY_WORKFLOW_TYPE = 'STORY' as const

const DEFAULT_STORY_PHASES = [
  { key: 'planning', name: 'Planning' },
  { key: 'implementation', name: 'Implementation' },
  { key: 'review', name: 'Review' },
  { key: 'qc', name: 'QC' },
] as const

const PHASE_DETAILS: Record<
  (typeof DEFAULT_STORY_PHASES)[number]['key'],
  { headline: string; body: string; checklist: string[] }
> = {
  planning: {
    headline: 'Technical planning with AI',
    body: 'Discuss architecture, schema, APIs, and implementation steps. Attach repo paths or code so the AI can ground recommendations in your codebase.',
    checklist: [
      'Confirm modules and boundaries (libs vs apps)',
      'Agree on data model, migrations, and API contracts',
      'Break work into ordered steps for Implementation',
    ],
  },
  implementation: {
    headline: 'Build the feature in the codebase',
    body: 'Implement backend and frontend changes in the linked repositories, following the plan from the previous phase.',
    checklist: [
      'Schema / migrations and domain services',
      'API endpoints and validation',
      'Admin UI and integration with existing screens',
    ],
  },
  review: {
    headline: 'Review code and design',
    body: 'Peer review for correctness, security, and maintainability before QA sign-off.',
    checklist: ['Code review on PRs', 'UX pass on admin flows', 'Address review feedback'],
  },
  qc: {
    headline: 'Test and sign off',
    body: 'Run manual and automated checks to confirm behaviour matches requirements.',
    checklist: [
      'Happy-path and edge-case testing',
      'Regression on orders / products',
      'Mark workflow complete when quality bar is met',
    ],
  },
}

const BRAINSTORM_STARTERS = [
  'We need inventory tracking with stock-in/out history and low-stock alerts.',
  'This is a small feature on our existing e-commerce app — about 2 weeks.',
  'Orders should automatically reduce stock when placed.',
]

type WorkflowClassificationSnapshot = {
  reasoning?: string
  confidence?: number
  type?: string
  estimatedHours?: number
}

type WorkflowPhaseItem = {
  id: string
  key: string
  name: string
  sequence: number
  status: string
  execution?: {
    status: string
    runType?: string
    branch?: string
    workspacePath?: string
    pullRequestUrl?: string
    pullRequestNumber?: number
    lastError?: string
    updatedAt?: string
  } | null
  reviewSummary?: string
  commitSha?: string
}

const AUTOMATED_PHASE_KEYS = new Set(['implementation', 'review', 'qc'])

const CHAT_ENABLED_STATUSES = new Set(['DRAFT', 'BRAINSTORMING', 'CLASSIFICATION_PENDING'])

function workflowPhasesQueryKey(orgId: string, projectId: string, workflowId: string) {
  return ['workflow-phases', orgId, projectId, workflowId] as const
}

export function WorkflowDetailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { orgId, projectId, workflowId } = useParams<{
    orgId: string
    projectId: string
    workflowId: string
  }>()

  const [inputMessage, setInputMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [canClassify, setCanClassify] = useState(false)
  const [classification, setClassification] = useState<ClassifyResponseDto | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string>('planning')
  const [workspaceTab, setWorkspaceTab] = useState<'phase' | 'transcript'>('phase')
  const [showPhaseApproveDialog, setShowPhaseApproveDialog] = useState(false)
  const [phaseApproveNote, setPhaseApproveNote] = useState('')

  const enabled = !!orgId && !!projectId && !!workflowId

  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    isError: isWorkflowError,
    refetch: refetchWorkflow,
  } = useWorkflowsControllerFindOne(orgId!, projectId!, workflowId!, {
    query: { enabled },
  })

  const {
    data: sessionData,
    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useWorkflowBrainstormingControllerGetBrainstormSession(orgId!, projectId!, workflowId!, {
    query: { enabled },
  })

  const effectiveSessionId = sessionId ?? sessionData?.sessionId ?? null
  const effectiveCanClassify = canClassify || sessionData?.canClassify === true

  const messages = useMemo(() => {
    return (sessionData?.messages ?? []).map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: new Date(msg.createdAt),
    }))
  }, [sessionData?.messages])

  const { mutateAsync: sendBrainstormMessage, isPending: isSending } = useWorkflowBrainstormingControllerBrainstorm()

  const { mutateAsync: classifyWorkflow, isPending: isClassifying } = useWorkflowBrainstormingControllerClassify()

  const { mutateAsync: confirmClassification, isPending: isConfirming } = useWorkflowsControllerConfirmClassification()

  const { mutateAsync: approvePhase, isPending: isApprovingPhase } = useWorkflowsControllerApprovePhase()

  const invalidateWorkflowQueries = async () => {
    if (!orgId || !projectId || !workflowId) return
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getWorkflowsControllerFindOneQueryKey(orgId, projectId, workflowId),
      }),
      queryClient.invalidateQueries({
        queryKey: getWorkflowBrainstormingControllerGetBrainstormSessionQueryKey(orgId, projectId, workflowId),
      }),
      queryClient.invalidateQueries({
        queryKey: workflowPhasesQueryKey(orgId, projectId, workflowId),
      }),
    ])
  }

  const handleSendMessage = async () => {
    if (!orgId || !projectId || !workflowId || !inputMessage.trim()) return

    setActionError(null)
    const userMessage = inputMessage.trim()
    setInputMessage('')

    try {
      const response = await sendBrainstormMessage({
        orgId,
        projectId,
        id: workflowId,
        data: { userMessage },
      })

      setSessionId(response.sessionId)
      setCanClassify(response.canClassify)
      await invalidateWorkflowQueries()
      await Promise.all([refetchWorkflow(), refetchSession()])
    } catch (err) {
      setInputMessage(userMessage)
      setActionError(getErrorMessage(err) || 'Failed to send message')
    }
  }

  const handleClassify = async () => {
    if (!orgId || !projectId || !workflowId || !effectiveSessionId) return

    setActionError(null)

    try {
      const result = await classifyWorkflow({
        orgId,
        projectId,
        id: workflowId,
        data: { sessionId: effectiveSessionId },
      })
      setClassification(result)
      setShowConfirmDialog(true)
      await refetchSession()
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Classification failed')
    }
  }

  const handleConfirmClassification = async () => {
    if (!orgId || !projectId || !workflowId) return

    setActionError(null)

    try {
      await confirmClassification({
        orgId,
        projectId,
        id: workflowId,
        data: { type: STORY_WORKFLOW_TYPE },
      })
      setShowConfirmDialog(false)
      setClassification(null)
      setCanClassify(false)
      await invalidateWorkflowQueries()
      await refetchWorkflow()
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to confirm classification')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary'
      case 'BRAINSTORMING':
      case 'CLASSIFICATION_PENDING':
        return 'default'
      case 'ACTIVE':
        return 'default'
      case 'WAITING_APPROVAL':
        return 'outline'
      case 'FAILED':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HOTFIX':
        return { variant: 'destructive' as const, icon: '🔥' }
      case 'STORY':
        return { variant: 'default' as const, icon: '📝' }
      case 'EPIC':
        return { variant: 'default' as const, icon: '🚀' }
      default:
        return { variant: 'outline' as const, icon: '' }
    }
  }

  const chatEnabled = workflow ? CHAT_ENABLED_STATUSES.has(workflow.status) : false
  const isBrainstormPhase = chatEnabled

  const { data: phasesData, refetch: refetchPhases } = useQuery({
    queryKey: workflowPhasesQueryKey(orgId!, projectId!, workflowId!),
    enabled: enabled && !!workflow && !isBrainstormPhase,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const running = items.some((p) => p.execution?.status === 'RUNNING')
      return running ? 3000 : false
    },
    queryFn: () =>
      customInstance<{ items: WorkflowPhaseItem[] }>({
        url: `/api/organizations/${orgId}/projects/${projectId}/workflows/${workflowId}/phases`,
        method: 'GET',
      }),
  })

  const phases = phasesData?.items ?? []

  const displayPhases = useMemo((): WorkflowPhaseItem[] => {
    if (phases.length > 0) {
      return [...phases].sort((a, b) => a.sequence - b.sequence)
    }
    if (!workflow || isBrainstormPhase) {
      return []
    }

    const currentKey = workflow.currentPhaseKey ?? 'planning'
    const currentIndex = DEFAULT_STORY_PHASES.findIndex((p) => p.key === currentKey)

    return DEFAULT_STORY_PHASES.map((phase, index) => {
      let status = 'PENDING'
      if (currentIndex >= 0) {
        if (index < currentIndex) status = 'COMPLETED'
        else if (index === currentIndex) status = 'IN_PROGRESS'
      } else if (phase.key === 'planning') {
        status = 'IN_PROGRESS'
      }

      return {
        id: phase.key,
        key: phase.key,
        name: phase.name,
        sequence: index + 1,
        status,
      }
    })
  }, [phases, workflow, isBrainstormPhase])

  const currentPhase =
    displayPhases.find((p) => p.key === workflow?.currentPhaseKey) ??
    displayPhases.find((p) => p.status === 'IN_PROGRESS') ??
    displayPhases[0]

  const classificationSnapshot = (workflow?.classification ?? null) as WorkflowClassificationSnapshot | null

  useEffect(() => {
    if (currentPhase?.key) {
      setSelectedPhaseKey(currentPhase.key)
    }
  }, [currentPhase?.key])

  const selectedPhase = displayPhases.find((p) => p.key === selectedPhaseKey) ?? displayPhases[0] ?? null

  const selectedPhaseDetail =
    selectedPhase && selectedPhase.key in PHASE_DETAILS
      ? PHASE_DETAILS[selectedPhase.key as keyof typeof PHASE_DETAILS]
      : null

  const isBusy = isSending || isClassifying || isConfirming || isApprovingPhase

  const showPlanningChat =
    workflow?.status === 'ACTIVE' &&
    workflow.currentPhaseKey === 'planning' &&
    workspaceTab === 'phase' &&
    selectedPhase?.key === 'planning'

  const selectedPhaseRunning = selectedPhase?.execution?.status === 'RUNNING'

  const canShowPhaseApprove =
    (workflow?.status === 'ACTIVE' || workflow?.status === 'WAITING_APPROVAL') &&
    !!workflow.currentPhaseKey &&
    selectedPhase?.key === workflow.currentPhaseKey &&
    (selectedPhase.status === 'IN_PROGRESS' || selectedPhase.status === 'WAITING_APPROVAL') &&
    !selectedPhaseRunning

  const nextPhaseAfterCurrent = useMemo(() => {
    if (!workflow?.currentPhaseKey) return null
    const index = DEFAULT_STORY_PHASES.findIndex((p) => p.key === workflow.currentPhaseKey)
    if (index < 0 || index >= DEFAULT_STORY_PHASES.length - 1) return null
    return DEFAULT_STORY_PHASES[index + 1]
  }, [workflow?.currentPhaseKey])

  const handleSendBackToImplementation = async () => {
    if (!orgId || !projectId || !workflowId) return
    setActionError(null)
    try {
      await customInstance({
        url: `/api/organizations/${orgId}/projects/${projectId}/workflows/${workflowId}/phases/send-back`,
        method: 'POST',
        data: { targetPhaseKey: 'implementation', reason: phaseApproveNote.trim() || undefined },
      })
      setPhaseApproveNote('')
      setSelectedPhaseKey('implementation')
      await invalidateWorkflowQueries()
      await Promise.all([refetchWorkflow(), refetchPhases()])
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to send back to implementation')
    }
  }

  const handleConfirmPhaseApprove = async () => {
    if (!orgId || !projectId || !workflowId) return
    setActionError(null)
    try {
      const result = await approvePhase({
        orgId,
        projectId,
        id: workflowId,
        data: phaseApproveNote.trim() ? { note: phaseApproveNote.trim() } : {},
      })
      setShowPhaseApproveDialog(false)
      setPhaseApproveNote('')
      if (result.currentPhaseKey) {
        setSelectedPhaseKey(result.currentPhaseKey)
      }
      await invalidateWorkflowQueries()
      await refetchWorkflow()
    } catch (err) {
      setActionError(getErrorMessage(err) || 'Failed to approve phase')
    }
  }

  const confirmedAtLabel = workflow?.classificationConfirmedAt
    ? new Date(workflow.classificationConfirmedAt).toLocaleString()
    : null

  if (isLoadingWorkflow || (isBrainstormPhase && isLoadingSession)) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading workflow...</p>
        </div>
      </div>
    )
  }

  if (isWorkflowError || !workflow) {
    return (
      <div className='space-y-4'>
        <p className='text-destructive'>Workflow not found or failed to load.</p>
        {orgId && projectId && (
          <Button variant='outline' onClick={() => navigate(routes.projectWorkflows(orgId, projectId))}>
            Back to workflows
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => orgId && projectId && navigate(routes.projectWorkflows(orgId, projectId))}
          >
            <svg className='mr-2 h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
            Back
          </Button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-3xl font-bold tracking-tight'>{workflow.title}</h1>
              <Badge variant={getStatusBadgeVariant(workflow.status)}>{workflow.status}</Badge>
              {workflow.type && (
                <Badge variant={getTypeBadge(workflow.type).variant}>
                  {getTypeBadge(workflow.type).icon} {workflow.type}
                </Badge>
              )}
            </div>
            {workflow.description && <p className='mt-1 text-muted-foreground'>{workflow.description}</p>}
          </div>
        </div>
      </div>

      {actionError && (
        <div className='rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          {actionError}
        </div>
      )}

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          {isBrainstormPhase ? (
            <Card className='flex h-[calc(100dvh-10rem)] max-h-[900px] min-h-[480px] flex-col overflow-hidden'>
              <CardHeader className='shrink-0'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <CardTitle>Brainstorming</CardTitle>
                    <CardDescription>Discuss with AI to refine requirements and classify the workflow</CardDescription>
                  </div>
                  {effectiveCanClassify && (
                    <Button variant='secondary' size='sm' onClick={handleClassify} disabled={isBusy}>
                      {isClassifying ? 'Classifying...' : 'Run AI classification'}
                    </Button>
                  )}
                </div>
                {effectiveCanClassify && (
                  <p className='mt-2 text-sm text-muted-foreground'>
                    Enough context collected — run classification when you are ready, or keep chatting to refine scope.
                  </p>
                )}
              </CardHeader>
              <CardContent className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pb-(--card-spacing)'>
                <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-muted/50'>
                  <BrainstormMessageList
                    messages={messages}
                    isSending={isSending}
                    emptyHint='Describe what you want to build. Use the suggestions below or write your own message.'
                  />
                </div>
                {messages.length === 0 && (
                  <div className='flex shrink-0 flex-wrap gap-2'>
                    {BRAINSTORM_STARTERS.map((prompt) => (
                      <Button
                        key={prompt}
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-auto whitespace-normal text-left text-xs'
                        disabled={isBusy}
                        onClick={() => setInputMessage(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                )}
                <div className='flex shrink-0 gap-2'>
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                    placeholder='Type your message... (Enter to send, Shift+Enter for new line)'
                    rows={3}
                    disabled={isBusy}
                  />
                  <Button
                    onClick={() => void handleSendMessage()}
                    disabled={isBusy || !inputMessage.trim()}
                    className='self-end'
                  >
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='overflow-hidden'>
              <CardHeader className='border-b bg-muted/30'>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div>
                    <CardTitle className='text-xl'>Story workflow</CardTitle>
                    <CardDescription>
                      {currentPhase
                        ? `Focus: ${currentPhase.name} — select a phase below to see what to do in this step.`
                        : 'Select a phase to see guidance for this workflow.'}
                    </CardDescription>
                  </div>
                  <div className='flex rounded-lg border bg-background p-1 text-sm'>
                    <button
                      type='button'
                      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                        workspaceTab === 'phase'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setWorkspaceTab('phase')}
                    >
                      Phase workspace
                    </button>
                    <button
                      type='button'
                      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                        workspaceTab === 'transcript'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setWorkspaceTab('transcript')}
                    >
                      Requirements ({messages.length})
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='space-y-6 p-6'>
                {workspaceTab === 'phase' ? (
                  <>
                    <PhaseStepper
                      phases={displayPhases}
                      selectedKey={selectedPhaseKey}
                      onSelect={setSelectedPhaseKey}
                    />
                    {canShowPhaseApprove && workspaceTab === 'phase' && (
                      <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3'>
                        <p className='text-sm text-muted-foreground'>
                          {nextPhaseAfterCurrent
                            ? `When ${selectedPhase?.name ?? 'this phase'} is done, approve to continue to ${nextPhaseAfterCurrent.name}.`
                            : `When ${selectedPhase?.name ?? 'this phase'} is done, approve to complete the workflow.`}
                        </p>
                        <Button
                          size='sm'
                          disabled={isBusy}
                          data-testid='phase-approve-trigger'
                          onClick={() => setShowPhaseApproveDialog(true)}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                    {selectedPhase && selectedPhaseDetail ? (
                      showPlanningChat ? (
                        <div className='rounded-xl border bg-card p-6 shadow-sm'>
                          <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                            <div>
                              <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                Phase {selectedPhase.sequence}
                              </p>
                              <h2 className='text-2xl font-semibold tracking-tight'>{selectedPhase.name}</h2>
                              <p className='mt-1 text-sm text-muted-foreground'>{selectedPhaseDetail.headline}</p>
                            </div>
                            <PhaseStatusBadge status={selectedPhase.status} />
                          </div>
                          {orgId && projectId && workflowId && (
                            <PlanningWorkspace
                              orgId={orgId}
                              projectId={projectId}
                              workflowId={workflowId}
                              scopeSummary={classificationSnapshot?.reasoning}
                              onError={setActionError}
                            />
                          )}
                        </div>
                      ) : (
                        <div className='rounded-xl border bg-card p-6 shadow-sm'>
                          <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                            <div>
                              <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                                Phase {selectedPhase.sequence}
                              </p>
                              <h2 className='text-2xl font-semibold tracking-tight'>{selectedPhase.name}</h2>
                            </div>
                            <PhaseStatusBadge status={selectedPhase.status} />
                          </div>
                          <p className='text-lg text-foreground/90'>{selectedPhaseDetail.headline}</p>
                          <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
                            {selectedPhaseDetail.body}
                          </p>
                          {selectedPhase.key === 'planning' &&
                            workflow.currentPhaseKey !== 'planning' &&
                            workflow.status === 'ACTIVE' && (
                              <p className='mt-4 text-sm text-muted-foreground'>
                                Planning chat is available when this phase is current. Finish or advance phases from the
                                workflow controls when those are enabled.
                              </p>
                            )}
                          {selectedPhase.key === 'planning' && classificationSnapshot?.reasoning && (
                            <div className='mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4'>
                              <p className='mb-2 text-sm font-medium'>Scope from brainstorm</p>
                              <p className='text-sm leading-relaxed text-foreground/90'>
                                {classificationSnapshot.reasoning}
                              </p>
                            </div>
                          )}
                          {AUTOMATED_PHASE_KEYS.has(selectedPhase.key) && (
                            <PhaseAutomationPanel
                              phaseName={selectedPhase.name}
                              phaseKey={selectedPhase.key}
                              execution={selectedPhase.execution}
                              reviewSummary={selectedPhase.reviewSummary}
                              commitSha={selectedPhase.commitSha}
                              isCurrentPhase={selectedPhase.key === workflow.currentPhaseKey}
                              onSendBack={
                                selectedPhase.key === workflow.currentPhaseKey
                                  ? handleSendBackToImplementation
                                  : undefined
                              }
                              sendBackBusy={isBusy}
                            />
                          )}
                          <div className='mt-6'>
                            <p className='mb-2 text-sm font-medium'>Suggested checklist</p>
                            <ul className='space-y-2'>
                              {selectedPhaseDetail.checklist.map((item) => (
                                <li key={item} className='flex gap-2 text-sm text-muted-foreground'>
                                  <span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary' aria-hidden />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )
                    ) : (
                      <p className='text-sm text-muted-foreground'>No phase selected.</p>
                    )}
                  </>
                ) : (
                  <div className='min-h-[320px] rounded-xl border bg-muted/30'>
                    {messages.length > 0 ? (
                      <BrainstormMessageList messages={messages} />
                    ) : (
                      <div className='flex min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center'>
                        <p className='font-medium'>No requirements transcript</p>
                        <p className='max-w-md text-sm text-muted-foreground'>
                          This workflow has no saved brainstorm messages. Scope may still be in the workflow title and
                          description.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              <div>
                <p className='mb-1 text-muted-foreground'>Status</p>
                <Badge variant={getStatusBadgeVariant(workflow.status)}>{workflow.status}</Badge>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Type</p>
                <p className='font-medium'>{workflow.type ?? (isBrainstormPhase ? 'Pending' : 'STORY')}</p>
              </div>
              {classificationSnapshot?.reasoning && !isBrainstormPhase && (
                <div>
                  <p className='mb-1 text-muted-foreground'>Scope summary</p>
                  <p className='line-clamp-4 text-sm leading-relaxed'>{classificationSnapshot.reasoning}</p>
                </div>
              )}
              {confirmedAtLabel && (
                <div>
                  <p className='mb-1 text-muted-foreground'>Started</p>
                  <p className='font-medium'>{confirmedAtLabel}</p>
                </div>
              )}
              <div>
                <p className='mb-1 text-muted-foreground'>Repositories</p>
                <p className='font-medium'>{workflow.repositories?.length ?? 0} linked</p>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Messages</p>
                <p className='font-medium'>{sessionData?.messageCount ?? messages.length}</p>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Created</p>
                <p className='font-medium'>{new Date(workflow.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <StepItem done title='Create workflow' detail='Completed' />
              <StepItem
                done={workflow.status !== 'DRAFT'}
                active={workflow.status === 'DRAFT' || workflow.status === 'BRAINSTORMING'}
                step={2}
                title='Brainstorming'
                detail={
                  workflow.status === 'DRAFT'
                    ? 'Send a message to start'
                    : workflow.status === 'BRAINSTORMING'
                      ? 'In progress'
                      : 'Completed'
                }
              />
              <StepItem
                done={workflow.status === 'ACTIVE' || workflow.status === 'CLASSIFICATION_PENDING'}
                active={workflow.status === 'BRAINSTORMING' && effectiveCanClassify}
                step={3}
                title='Review & start'
                detail={
                  workflow.status === 'ACTIVE'
                    ? 'Workflow running'
                    : effectiveCanClassify
                      ? 'Run review, then start story'
                      : 'Keep brainstorming'
                }
              />
              <StepItem
                done={workflow.status === 'ACTIVE'}
                active={workflow.status === 'ACTIVE' && !!currentPhase}
                step={4}
                title='Execute phases'
                detail={currentPhase ? `In ${currentPhase.name}` : 'Planning → Implementation → Review → QC'}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Ready to start</DialogTitle>
            <DialogDescription>Review the brainstorm summary and activate the story workflow</DialogDescription>
          </DialogHeader>

          {classification && (
            <div className='space-y-4 py-4'>
              <div className='rounded-lg border-2 border-primary bg-primary/5 p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <h3 className='font-semibold'>Workflow</h3>
                  <Badge variant='default' className='text-base'>
                    📝 STORY
                  </Badge>
                </div>
                <div className='space-y-2 text-sm'>
                  <div>
                    <span className='text-muted-foreground'>Confidence: </span>
                    <span className='font-medium'>{(classification.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {classification.priority && (
                    <div>
                      <span className='text-muted-foreground'>Priority: </span>
                      <span className='font-medium'>{classification.priority}</span>
                    </div>
                  )}
                  {classification.estimatedHours != null && (
                    <div>
                      <span className='text-muted-foreground'>Estimated effort: </span>
                      <span className='font-medium'>{classification.estimatedHours}h</span>
                    </div>
                  )}
                  <div>
                    <p className='mb-1 font-medium text-muted-foreground'>Reasoning:</p>
                    <p>{classification.reasoning}</p>
                  </div>
                </div>
              </div>

              <div className='rounded-lg border p-4'>
                <h3 className='mb-2 font-semibold'>Phases</h3>
                <p className='mb-3 text-sm text-muted-foreground'>
                  Standard story pipeline (MVP). AI scope summary above; execution follows these steps.
                </p>
                <ol className='space-y-2 text-sm'>
                  {DEFAULT_STORY_PHASES.map((phase, index) => (
                    <li key={phase.key} className='flex items-center gap-2'>
                      <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium'>
                        {index + 1}
                      </span>
                      <span className='font-medium'>{phase.name}</span>
                      <span className='text-muted-foreground'>({phase.key})</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConfirmDialog(false)} disabled={isConfirming}>
              Continue Discussion
            </Button>
            <Button onClick={() => void handleConfirmClassification()} disabled={isConfirming}>
              {isConfirming ? 'Starting…' : 'Start story workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhaseApproveDialog} onOpenChange={setShowPhaseApproveDialog}>
        <DialogContent className='max-w-md' data-testid='phase-approve-modal'>
          <DialogHeader>
            <DialogTitle>Approve {selectedPhase?.name ?? 'phase'}?</DialogTitle>
            <DialogDescription>
              {nextPhaseAfterCurrent
                ? `This marks ${selectedPhase?.name ?? 'the current phase'} complete and starts ${nextPhaseAfterCurrent.name}.`
                : 'This marks the final phase complete and closes the workflow.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={phaseApproveNote}
            onChange={(e) => setPhaseApproveNote(e.target.value)}
            rows={3}
            placeholder='Optional note (stored on this phase)…'
            disabled={isApprovingPhase}
            className='text-sm'
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowPhaseApproveDialog(false)} disabled={isApprovingPhase}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmPhaseApprove()}
              disabled={isApprovingPhase}
              data-testid='phase-approve-ok'
            >
              {isApprovingPhase ? 'Approving…' : 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type BrainstormMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

function BrainstormMessageList({
  messages,
  isSending = false,
  emptyHint,
}: {
  messages: BrainstormMessage[]
  isSending?: boolean
  emptyHint?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousMessageCountRef = useRef(0)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const messageCount = messages.length
    const shouldStickToBottom = messageCount > previousMessageCountRef.current || isSending
    previousMessageCountRef.current = messageCount

    if (shouldStickToBottom) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isSending])

  return (
    <div ref={scrollRef} className='h-full min-h-0 flex-1 overflow-y-auto overscroll-contain p-4'>
      <div className='space-y-4'>
        {messages.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            {emptyHint ?? 'No messages yet. Describe what you want to build or fix to start the conversation.'}
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background border shadow-sm'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ChatMarkdown content={message.content} />
                ) : (
                  <p className='whitespace-pre-wrap text-sm'>{message.content}</p>
                )}
                <p className='mt-1 text-xs opacity-70'>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className='flex justify-start'>
            <div className='max-w-[80%] rounded-lg border bg-background px-4 py-2 shadow-sm'>
              <div className='flex items-center gap-1'>
                <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]'></div>
                <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]'></div>
                <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground'></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PhaseStatusBadge({ status }: { status: string }) {
  const label =
    status === 'IN_PROGRESS'
      ? 'In progress'
      : status === 'WAITING_APPROVAL'
        ? 'Waiting approval'
        : status === 'COMPLETED'
          ? 'Completed'
          : status === 'PENDING'
            ? 'Pending'
            : status

  const variant =
    status === 'IN_PROGRESS'
      ? 'default'
      : status === 'WAITING_APPROVAL'
        ? 'outline'
        : status === 'COMPLETED'
          ? 'secondary'
          : ('outline' as const)

  return <Badge variant={variant}>{label}</Badge>
}

function PhaseStepper({
  phases,
  selectedKey,
  onSelect,
}: {
  phases: WorkflowPhaseItem[]
  selectedKey: string
  onSelect: (key: string) => void
}) {
  if (phases.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Phases are not loaded yet. Refresh the page or start the workflow from the brainstorm step.
      </p>
    )
  }

  return (
    <div className='overflow-x-auto pb-1'>
      <ol className='flex min-w-max items-stretch gap-0'>
        {phases.map((phase, index) => {
          const isSelected = phase.key === selectedKey
          const isActive = phase.status === 'IN_PROGRESS'
          const isDone = phase.status === 'COMPLETED'

          return (
            <li key={phase.id} className='flex items-stretch'>
              <button
                type='button'
                onClick={() => onSelect(phase.key)}
                className={`group relative flex min-w-[140px] max-w-[180px] flex-col rounded-lg border px-3 py-3 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <span
                  className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isDone ? '✓' : phase.sequence}
                </span>
                <span className='text-sm font-semibold leading-tight'>{phase.name}</span>
                <span className='mt-1 text-xs text-muted-foreground capitalize'>
                  {phase.status.replace('_', ' ').toLowerCase()}
                </span>
              </button>
              {index < phases.length - 1 && (
                <div className='flex w-6 shrink-0 items-center justify-center text-muted-foreground' aria-hidden>
                  →
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StepItem({
  step,
  title,
  detail,
  done,
  active,
}: {
  step?: number
  title: string
  detail: string
  done?: boolean
  active?: boolean
}) {
  return (
    <div className='flex items-start gap-2'>
      <div
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          done
            ? 'bg-primary/10 text-primary'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {done ? '✓' : step}
      </div>
      <div>
        <p className='font-medium'>{title}</p>
        <p className='text-xs text-muted-foreground'>{detail}</p>
      </div>
    </div>
  )
}
