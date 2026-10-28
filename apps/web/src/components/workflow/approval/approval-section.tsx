import { useToast } from '../../../hooks/use-toast'
import { ToastContainer } from '../../ui/toast'
import { ApproveButton } from './approve-button'
import { PlanViewer } from './plan-viewer'
import { RejectButton } from './reject-button'

import type { WorkflowRunResponseDto } from '../../../api/generated/models'

interface ApprovalSectionProps {
  workflow: WorkflowRunResponseDto
}

/**
 * Container for approval UI: plan viewer + approve/reject buttons
 * Only visible when workflow status is waiting_approval
 */
export function ApprovalSection({ workflow }: ApprovalSectionProps) {
  const { toasts, dismissToast, toast } = useToast()

  if (workflow.status !== 'waiting_approval') {
    return null
  }

  const handleApprovalSuccess = () => {
    toast({
      type: 'success',
      title: 'Workflow approved successfully',
      message: 'The workflow will now proceed with implementation',
    })
  }

  const handleRejectionSuccess = () => {
    toast({
      type: 'error',
      title: 'Workflow rejected',
      message: 'The workflow has been cancelled',
    })
  }

  return (
    <>
      <section className='approval-section'>
        <header className='section-header'>
          <h2>Plan Review & Approval</h2>
          <p className='section-description'>Review the AI-generated implementation plan before proceeding</p>
        </header>

        <PlanViewer orgId={workflow.organizationId} runId={workflow.id} />

        <div className='approval-actions'>
          <ApproveButton orgId={workflow.organizationId} runId={workflow.id} onSuccess={handleApprovalSuccess} />
          <RejectButton orgId={workflow.organizationId} runId={workflow.id} onSuccess={handleRejectionSuccess} />
        </div>
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
