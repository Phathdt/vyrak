import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { customInstance, getErrorMessage } from '@/api/client'
import {
  getWorkflowsControllerFindOneQueryKey,
  useWorkflowsControllerApprovePhase,
  useWorkflowsControllerFindOne,
} from '@/api/generated/workflows/workflows'
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
import { TechRefinementWorkspace } from '@/components/workflows/tech-refinement-workspace'
import { ArtifactList } from '@/features/artifacts'
import { routes } from '@/lib/routes'

const DEFAULT_STORY_PHASES = [
  { key: 'planning', name: 'Planning' },
  { key: 'implementation', name: 'Implementation' },
  { key: 'review', name: 'Review' },
  { key: 'qc', name: 'QC' },
] as const

const PHASE_DETAILS: Record<string, { headline: string; body: string; checklist: string[] }> = {
  planning: {
    headline: 'Technical planning with AI',
    body: 'Discuss architecture, schema, APIs, and implementation steps. Attach repo paths or code so the AI can ground recommendations in your codebase.',
    checklist: [
      'Confirm modules and boundaries (libs vs apps)',
      'Agree on data model, migrations, and API contracts',
      'Break work into ordered steps for Implementation',
    ],
  },
  'technical-refinement': {
    headline: 'Deep technical refinement with AI',
    body: 'Scout the codebase, discuss architectural decisions, create ADRs, and refine implementation plans. The AI can analyze your code structure and suggest concrete technical approaches.',
    checklist: [
      'Scout relevant code paths and dependencies',
      'Document architectural decisions (ADRs)',
      'Refine data models and API contracts',
      'Create detailed implementation plans with file-level tasks',
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

  const { mutateAsync: approvePhase, isPending: isApprovingPhase } = useWorkflowsControllerApprovePhase()

  const invalidateWorkflowQueries = async () => {
    if (!orgId || !projectId || !workflowId) return
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getWorkflowsControllerFindOneQueryKey(orgId, projectId, workflowId),
      }),
      queryClient.invalidateQueries({
        queryKey: workflowPhasesQueryKey(orgId, projectId, workflowId),
      }),
    ])
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'WAITING_APPROVAL':
        return 'outline'
      case 'COMPLETED':
        return 'secondary'
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

  const { data: phasesData, refetch: refetchPhases } = useQuery({
    queryKey: workflowPhasesQueryKey(orgId!, projectId!, workflowId!),
    enabled: enabled && !!workflow,
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
    if (!workflow) {
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
  }, [phases, workflow])

  const currentPhase =
    displayPhases.find((p) => p.key === workflow?.currentPhaseKey) ??
    displayPhases.find((p) => p.status === 'IN_PROGRESS') ??
    displayPhases[0]

  useEffect(() => {
    if (currentPhase?.key) {
      setSelectedPhaseKey(currentPhase.key)
    }
  }, [currentPhase?.key])

  const selectedPhase = displayPhases.find((p) => p.key === selectedPhaseKey) ?? displayPhases[0] ?? null

  const selectedPhaseDetail =
    selectedPhase && selectedPhase.key in PHASE_DETAILS ? PHASE_DETAILS[selectedPhase.key] : null

  const isBusy = isApprovingPhase

  // Show chat for planning and technical-refinement phases
  const CHAT_ENABLED_PHASES = ['planning', 'technical-refinement']
  const showPlanningChat =
    workflow?.status === 'ACTIVE' &&
    workflow.currentPhaseKey &&
    CHAT_ENABLED_PHASES.includes(workflow.currentPhaseKey) &&
    workspaceTab === 'phase' &&
    selectedPhase?.key === workflow.currentPhaseKey &&
    CHAT_ENABLED_PHASES.includes(selectedPhase.key)

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

  if (isLoadingWorkflow) {
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
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-6 p-6'>
              {workspaceTab === 'phase' && (
                <>
                  <PhaseStepper phases={displayPhases} selectedKey={selectedPhaseKey} onSelect={setSelectedPhaseKey} />
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
                        {orgId && projectId && workflowId && selectedPhase.key === 'planning' && (
                          <PlanningWorkspace
                            orgId={orgId}
                            projectId={projectId}
                            workflowId={workflowId}
                            onError={setActionError}
                          />
                        )}
                        {orgId && projectId && workflowId && selectedPhase.key === 'technical-refinement' && (
                          <TechRefinementWorkspace
                            orgId={orgId}
                            projectId={projectId}
                            workflowId={workflowId}
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
                        <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>{selectedPhaseDetail.body}</p>
                        {CHAT_ENABLED_PHASES.includes(selectedPhase.key) &&
                          workflow.currentPhaseKey !== selectedPhase.key &&
                          workflow.status === 'ACTIVE' && (
                            <p className='mt-4 text-sm text-muted-foreground'>
                              AI chat is available when this phase is current. Finish or advance phases from the
                              workflow controls.
                            </p>
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
                  {selectedPhase && orgId && workflowId && (
                    <ArtifactList
                      orgId={orgId}
                      workflowId={workflowId}
                      phaseId={selectedPhase.id}
                      title={`Artifacts for ${selectedPhase.name}`}
                      emptyMessage='No artifacts attached to this phase yet.'
                      className='rounded-xl border bg-card p-6 shadow-sm'
                      hideWhenEmpty
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
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
                <p className='font-medium'>{workflow.type ?? 'STORY'}</p>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Repositories</p>
                <p className='font-medium'>{workflow.repositories?.length ?? 0} linked</p>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Created</p>
                <p className='font-medium'>{new Date(workflow.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Documents</CardTitle>
              <CardDescription>PRD, ADR, ARD, and plan output from each phase.</CardDescription>
            </CardHeader>
            <CardContent>
              {orgId && workflowId ? (
                <ArtifactList orgId={orgId} workflowId={workflowId} title={undefined} />
              ) : (
                <p className='text-sm text-muted-foreground'>Artifacts unavailable.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <StepItem done title='Create workflow' detail='Workflow created' />
              <StepItem
                done={workflow.status === 'ACTIVE'}
                active={workflow.status === 'ACTIVE' && !!currentPhase}
                step={2}
                title='Execute phases'
                detail={currentPhase ? `In ${currentPhase.name}` : 'Planning → Implementation → Review → QC'}
              />
            </CardContent>
          </Card>
        </div>
      </div>

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
        Phases are not loaded yet. Refresh the page or start the workflow.
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
