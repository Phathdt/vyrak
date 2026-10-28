import { formatDistanceToNow } from 'date-fns'

interface ApprovalBannerProps {
  workflowId: string
  status: string
  startedAt?: string
}

/**
 * Prominent banner shown when workflow is waiting for approval
 * Positioned between WorkflowOverview and ApprovalSection
 */
export function ApprovalBanner({ status, startedAt }: ApprovalBannerProps) {
  if (status !== 'waiting_approval') return null

  const waitingDuration = startedAt ? formatDistanceToNow(new Date(startedAt), { addSuffix: true }) : 'just now'

  return (
    <div className='approval-banner' role='alert' aria-live='polite'>
      <div className='banner-content'>
        <span className='banner-icon' aria-hidden='true'>
          ⏸️
        </span>
        <div className='banner-text'>
          <p className='banner-title'>Workflow paused - Waiting for plan approval</p>
          <p className='banner-subtitle'>Waiting since {waitingDuration}</p>
        </div>
      </div>
    </div>
  )
}
