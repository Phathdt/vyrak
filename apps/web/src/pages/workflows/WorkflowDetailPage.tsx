import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

import { ToastContainer } from '../../components/ui/toast'
import { ApprovalBanner, ApprovalSection, ApprovalStatusCard } from '../../components/workflow/approval'
import { CancelWorkflowModal } from '../../components/workflow/cancel-workflow-modal'
import { ProgressBar } from '../../components/workflow/progress-bar'
import { SSEConnectionIndicator } from '../../components/workflow/sse-connection-indicator'
import { StatusBadge } from '../../components/workflow/StatusBadge'
import { StepDetailsPanel } from '../../components/workflow/StepDetailsPanel'
import { StepTimeline } from '../../components/workflow/StepTimeline'
import { WorkflowDiagram } from '../../components/workflow/workflow-diagram'
import { WorkflowOverview } from '../../components/workflow/WorkflowOverview'
import { useToast } from '../../hooks/use-toast'
import { useWorkflowCancel } from '../../hooks/use-workflow-cancel'
import { useWorkflowDetail } from '../../hooks/use-workflow-detail'
import { useWorkflowSSE } from '../../hooks/use-workflow-sse'
import '../../styles/workflow-approval.css'

export function WorkflowDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'diagram' | 'timeline'>('diagram')
  const { toasts, addToast, dismissToast } = useToast()
  const previousStatusRef = useRef<string | null>(null)

  // Call hooks unconditionally
  const { data: workflow, isLoading, error } = useWorkflowDetail(runId || '')
  const { connectionState, reconnecting } = useWorkflowSSE(runId || '')

  const {
    cancelWorkflow,
    isLoading: isCancelling,
    error: cancelError,
    reset: resetCancelError,
  } = useWorkflowCancel(runId || '', {
    onSuccess: () => {
      setShowCancelModal(false)
      // Toast notification would go here if available
    },
    onError: () => {
      // Error is displayed in modal
    },
  })

  const handleCancelClick = () => {
    setShowCancelModal(true)
    resetCancelError()
  }

  const handleCancelConfirm = async (reason?: string) => {
    await cancelWorkflow(reason)
  }

  const handleCancelModalClose = () => {
    if (!isCancelling) {
      setShowCancelModal(false)
      resetCancelError()
    }
  }

  // Show toast on status transitions
  useEffect(() => {
    if (!workflow) return

    const currentStatus = workflow.status
    const previousStatus = previousStatusRef.current

    if (previousStatus && previousStatus !== currentStatus) {
      const transitions = {
        queued_to_running: {
          type: 'info' as const,
          title: 'Workflow started',
          message: 'AI agents are now processing your requirements',
        },
        running_to_waiting_approval: {
          type: 'warning' as const,
          title: 'Approval required',
          message: 'Review the proposed changes before proceeding',
        },
        running_to_succeeded: {
          type: 'success' as const,
          title: 'Workflow completed',
          message: 'All steps executed successfully',
        },
        running_to_failed: {
          type: 'error' as const,
          title: 'Workflow failed',
          message: 'Check step details for error information',
        },
        running_to_cancelled: {
          type: 'info' as const,
          title: 'Workflow cancelled',
          message: 'Execution stopped by user request',
        },
      }

      const transitionKey = `${previousStatus}_to_${currentStatus}` as keyof typeof transitions
      const transition = transitions[transitionKey]

      if (transition) {
        addToast(transition)
      }
    }

    previousStatusRef.current = currentStatus
  }, [workflow?.status, addToast])

  if (!runId) {
    return (
      <div className='container py-8'>
        <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
          Invalid workflow run ID
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='container py-8'>
        <div className='flex flex-col items-center justify-center py-16'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          <p className='mt-4 text-muted-foreground'>Loading workflow details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='container py-8'>
        <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
          <p>Error loading workflow: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className='container py-8'>
        <div className='rounded-lg border p-4 text-muted-foreground'>Workflow not found</div>
      </div>
    )
  }

  const canCancel = workflow.status === 'running' || workflow.status === 'queued'

  const completedSteps = workflow.steps.filter(
    (step) => step.status === 'succeeded' || step.status === 'failed' || step.status === 'skipped'
  ).length

  return (
    <>
      <div className='container max-w-[1400px] py-8'>
        <header className='mb-8'>
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-3 text-sm text-muted-foreground'>
              <span>Organizations</span>
              <span>/</span>
              <a href='/workflows' className='text-cyan-400 hover:underline'>
                Workflows
              </a>
              <span>/</span>
              <span>{runId?.slice(0, 8)}</span>
            </div>
            <SSEConnectionIndicator connectionState={connectionState} reconnecting={reconnecting} />
          </div>

          <div className='flex items-start justify-between'>
            <div>
              <div className='mb-2 inline-block rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-xs text-muted-foreground'>
                {workflow.workflowKey}
              </div>
              <h1 className='text-3xl font-bold tracking-tight'>Workflow Run</h1>
            </div>
            <div className='flex items-center gap-3'>
              <StatusBadge status={workflow.status} />
              {canCancel && (
                <Button variant='destructive' onClick={handleCancelClick}>
                  Cancel Workflow
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className='space-y-8'>
          {/* Overview Section */}
          <section>
            <WorkflowOverview workflow={workflow} />
          </section>

          {/* Approval Banner */}
          <ApprovalBanner workflowId={workflow.id} status={workflow.status} startedAt={workflow.startedAt} />

          {/* Approval Section - Plan Viewer (only for waiting_approval) */}
          <ApprovalSection workflow={workflow} />

          {/* Approval Status Card - Shows after approval/rejection decision */}
          <ApprovalStatusCard workflow={workflow} />

          {/* Progress Section */}
          <section>
            <ProgressBar completed={completedSteps} total={workflow.steps.length} status={workflow.status} />
          </section>

          {/* View Mode Toggle */}
          <section className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold'>Workflow Execution</h2>
            <div className='flex gap-2 rounded-lg border border-border bg-surface-2 p-1'>
              <button
                type='button'
                onClick={() => setViewMode('diagram')}
                className={`
                  rounded-md px-4 py-2 text-sm font-medium transition-colors
                  ${viewMode === 'diagram' ? 'bg-cyan-500/10 text-cyan-400' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                Diagram
              </button>
              <button
                type='button'
                onClick={() => setViewMode('timeline')}
                className={`
                  rounded-md px-4 py-2 text-sm font-medium transition-colors
                  ${viewMode === 'timeline' ? 'bg-cyan-500/10 text-cyan-400' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                Timeline
              </button>
            </div>
          </section>

          {/* Diagram/Timeline Section */}
          <section>
            {workflow.steps.length > 0 ? (
              <>
                {viewMode === 'diagram' ? (
                  <div className='h-[600px] w-full overflow-hidden rounded-xl border border-border bg-surface-1'>
                    <WorkflowDiagram steps={workflow.steps} onStepClick={setSelectedStepId} />
                  </div>
                ) : (
                  <StepTimeline
                    steps={workflow.steps}
                    selectedStepId={selectedStepId}
                    onStepClick={setSelectedStepId}
                  />
                )}
              </>
            ) : (
              <div className='rounded-xl border border-dashed border-border bg-surface-1 p-12 text-center'>
                <p className='text-muted-foreground'>No steps yet. Workflow is initializing...</p>
              </div>
            )}
          </section>
        </div>

        {/* Step Details Panel */}
        {selectedStepId && workflow.steps.find((s) => s.id === selectedStepId) && (
          <StepDetailsPanel
            key={selectedStepId}
            step={workflow.steps.find((s) => s.id === selectedStepId)!}
            onClose={() => setSelectedStepId(null)}
          />
        )}

        {showCancelModal && (
          <CancelWorkflowModal
            workflowId={workflow.id}
            workflowName={workflow.workflowKey}
            onConfirm={handleCancelConfirm}
            onCancel={handleCancelModalClose}
            isLoading={isCancelling}
            error={cancelError?.message || null}
          />
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
