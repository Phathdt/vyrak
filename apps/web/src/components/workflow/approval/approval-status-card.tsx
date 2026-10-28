import { formatDistanceToNow } from 'date-fns'

import type { WorkflowRunResponseDto } from '../../../api/generated/models'

interface ApprovalStatusCardProps {
  workflow: WorkflowRunResponseDto
}

/**
 * Displays approval or rejection status after decision is made
 * Shows approver/reviewer info, timestamp, and comment/reason
 * Replaces ApprovalSection after decision
 */
export function ApprovalStatusCard({ workflow }: ApprovalStatusCardProps) {
  // Check for rejection (workflow cancelled with reason)
  const isRejected = workflow.status === 'cancelled' && workflow.cancelledAt && workflow.cancellationReason

  // Check for approval
  // Note: Backend doesn't have approvedAt/approvedByUserId yet
  // For now, we detect approval by checking if workflow transitioned from waiting_approval to running
  // This is a placeholder - will need backend support for full approval history
  const isApproved = false // TODO: Implement when backend adds approval metadata

  if (!isApproved && !isRejected) {
    return null
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString))
  }

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  // Format user ID (slice first 8 chars for display)
  const formatUserId = (userId?: string) => {
    if (!userId) return 'Unknown user'
    return userId.slice(0, 8)
  }

  if (isApproved) {
    // Placeholder for approved state - needs backend support
    return (
      <div className='approval-status-card approved'>
        <div className='status-header'>
          <div className='status-icon-wrapper'>
            <span className='status-icon' aria-hidden='true'>
              ✅
            </span>
          </div>
          <div className='status-info'>
            <h3 className='status-title'>Plan Approved</h3>
            <p className='status-meta'>
              <span className='approver-name'>User</span>
              {' • '}
              <time>Recently</time>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isRejected) {
    return (
      <div className='approval-status-card rejected'>
        <div className='status-header'>
          <div className='status-icon-wrapper'>
            <span className='status-icon' aria-hidden='true'>
              ❌
            </span>
          </div>
          <div className='status-info'>
            <h3 className='status-title'>Plan Rejected</h3>
            <p className='status-meta'>
              <span className='reviewer-name'>{formatUserId(workflow.cancelledByUserId)}</span>
              {' • '}
              <time dateTime={workflow.cancelledAt} title={formatDateTime(workflow.cancelledAt!)}>
                {formatRelativeTime(workflow.cancelledAt!)}
              </time>
            </p>
          </div>
        </div>

        <div className='status-body'>
          <p className='status-reason-label'>Rejection Reason:</p>
          <p className='status-reason'>{workflow.cancellationReason}</p>
        </div>
      </div>
    )
  }

  return null
}
