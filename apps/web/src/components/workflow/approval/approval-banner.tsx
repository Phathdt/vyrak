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
    <div className='approval-banner' role='alert' aria-live='polite' data-testid='approval-banner'>
      <div className='banner-content'>
        <span className='banner-icon' aria-hidden='true' data-testid='approval-banner-icon'>
          ⏸️
        </span>
        <div className='banner-text'>
          <p className='banner-title' data-testid='approval-banner-message'>
            Workflow paused - Waiting for plan approval
          </p>
          <p className='banner-subtitle' data-testid='approval-waiting-timestamp'>
            Waiting since {waitingDuration}
          </p>
        </div>
      </div>
    </div>
  )
}
