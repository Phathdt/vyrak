import { useNavigate } from 'react-router-dom'

import { WorkflowRunSummaryDto } from '../../api/generated/models'
import { useApprovalActions } from '../../hooks/use-approval-actions'
import { StatusBadge } from '../workflow/StatusBadge'

interface ApprovalCardProps {
  approval: WorkflowRunSummaryDto
}

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const navigate = useNavigate()
  const { approve, reject, isLoading } = useApprovalActions()

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Approve this workflow?')) {
      try {
        await approve({ runId: approval.id })
      } catch (_error) {
        alert('Failed to approve workflow')
      }
    }
  }

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const comment = window.prompt('Please provide a reason for rejection:')
    if (comment) {
      try {
        await reject({ runId: approval.id, comment })
      } catch (_error) {
        alert('Failed to reject workflow')
      }
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'just now'
  }

  return (
    <div className='approval-card' onClick={() => navigate(`/workflows/${approval.id}`)}>
      <div className='approval-header'>
        <h3>{approval.workflowKey}</h3>
        <StatusBadge status={approval.status} />
      </div>

      <div className='approval-meta'>
        <span className='meta-item'>Run: {approval.id.slice(0, 8)}</span>
        <span className='meta-item'>Requested {approval.startedAt ? formatTimeAgo(approval.startedAt) : 'N/A'}</span>
      </div>

      {approval.status === 'waiting_approval' && (
        <div className='approval-actions'>
          <button onClick={handleApprove} disabled={isLoading} className='btn-success'>
            ✓ Approve
          </button>
          <button onClick={handleReject} disabled={isLoading} className='btn-danger'>
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  )
}
