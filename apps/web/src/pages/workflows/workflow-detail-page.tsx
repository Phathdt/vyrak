import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  getWorkflowBrainstormingControllerGetBrainstormSessionQueryKey,
  useWorkflowBrainstormingControllerBrainstorm,
  useWorkflowBrainstormingControllerClassify,
  useWorkflowBrainstormingControllerGetBrainstormSession,
} from '@/api/generated/workflows-brainstorming/workflows-brainstorming'
import {
  getWorkflowsControllerFindOneQueryKey,
  useWorkflowsControllerConfirmClassification,
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
import { routes } from '@/lib/routes'

import type { ClassifyResponseDto } from '@/api/generated/models'

type WorkflowType = 'HOTFIX' | 'STORY' | 'EPIC'

const CHAT_ENABLED_STATUSES = new Set(['DRAFT', 'BRAINSTORMING', 'CLASSIFICATION_PENDING'])

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
  const [selectedType, setSelectedType] = useState<WorkflowType | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  const invalidateWorkflowQueries = async () => {
    if (!orgId || !projectId || !workflowId) return
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getWorkflowsControllerFindOneQueryKey(orgId, projectId, workflowId),
      }),
      queryClient.invalidateQueries({
        queryKey: getWorkflowBrainstormingControllerGetBrainstormSessionQueryKey(orgId, projectId, workflowId),
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
      await refetchWorkflow()
    } catch (err) {
      setInputMessage(userMessage)
      setActionError(err instanceof Error ? err.message : 'Failed to send message')
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
      setSelectedType(result.type)
      setShowConfirmDialog(true)
      await refetchSession()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Classification failed')
    }
  }

  const handleConfirmClassification = async () => {
    if (!orgId || !projectId || !workflowId) return

    const finalType = selectedType ?? classification?.type
    if (!finalType) return

    setActionError(null)

    try {
      await confirmClassification({
        orgId,
        projectId,
        id: workflowId,
        data: { type: finalType },
      })
      setShowConfirmDialog(false)
      await invalidateWorkflowQueries()
      await refetchWorkflow()
      navigate(routes.projectWorkflows(orgId, projectId))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to confirm classification')
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
  const isBusy = isSending || isClassifying || isConfirming

  if (isLoadingWorkflow || isLoadingSession) {
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
        <div className='lg:col-span-2'>
          <Card className='flex h-[600px] flex-col'>
            <CardHeader>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <CardTitle>Brainstorming</CardTitle>
                  <CardDescription>Discuss with AI to refine requirements and classify the workflow</CardDescription>
                </div>
                {chatEnabled && effectiveCanClassify && (
                  <Button variant='secondary' size='sm' onClick={handleClassify} disabled={isBusy}>
                    {isClassifying ? 'Classifying...' : 'Run AI classification'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col gap-4'>
              <div className='flex-1 space-y-4 overflow-y-auto rounded-lg border bg-muted/50 p-4'>
                {messages.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    {chatEnabled
                      ? 'No messages yet. Describe what you want to build or fix to start the conversation.'
                      : 'This workflow is no longer in the brainstorming phase.'}
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border shadow-sm'
                        }`}
                      >
                        <p className='whitespace-pre-wrap text-sm'>{message.content}</p>
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

              {chatEnabled ? (
                <div className='flex gap-2'>
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
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Chat is closed for status <span className='font-medium'>{workflow.status}</span>.
                </p>
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
                <p className='font-medium'>{workflow.type ?? 'Not classified yet'}</p>
              </div>
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
                done={!!workflow.type || workflow.status === 'ACTIVE'}
                active={workflow.status === 'CLASSIFICATION_PENDING'}
                step={3}
                title='AI Classification'
                detail={effectiveCanClassify ? 'Ready — run classification' : 'Need more conversation'}
              />
              <StepItem
                done={workflow.status === 'ACTIVE' || !!workflow.classificationConfirmedAt}
                step={4}
                title='Human Confirmation'
                detail={workflow.status === 'ACTIVE' ? 'Completed' : 'Pending'}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>AI Classification Result</DialogTitle>
            <DialogDescription>Review the AI recommendation and confirm the workflow type</DialogDescription>
          </DialogHeader>

          {classification && (
            <div className='space-y-4 py-4'>
              <div className='rounded-lg border-2 border-primary bg-primary/5 p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <h3 className='font-semibold'>Recommended Type</h3>
                  <Badge variant={getTypeBadge(classification.type).variant} className='text-base'>
                    {getTypeBadge(classification.type).icon} {classification.type}
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

              <div>
                <p className='mb-2 text-sm font-medium'>Or choose a different type:</p>
                <div className='grid grid-cols-3 gap-2'>
                  {(['HOTFIX', 'STORY', 'EPIC'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={selectedType === type ? 'default' : 'outline'}
                      onClick={() => setSelectedType(type)}
                      className='justify-start'
                    >
                      {getTypeBadge(type).icon} {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConfirmDialog(false)} disabled={isConfirming}>
              Continue Discussion
            </Button>
            <Button onClick={() => void handleConfirmClassification()} disabled={isConfirming}>
              {isConfirming ? 'Confirming...' : `Confirm as ${selectedType ?? classification?.type}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
