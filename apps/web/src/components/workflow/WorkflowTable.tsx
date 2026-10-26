import { useNavigate } from 'react-router-dom'

import { StatusBadge } from './StatusBadge'

import { WorkflowRunSummaryDto } from '../../api/generated/models'

interface WorkflowTableProps {
  workflows: WorkflowRunSummaryDto[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

export function WorkflowTable({ workflows, total, page, limit, onPageChange }: WorkflowTableProps) {
  const navigate = useNavigate()

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  }

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return '-'
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    const duration = end - start

    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className='workflow-table-container'>
      <table className='workflow-table'>
        <thead>
          <tr>
            <th>Status</th>
            <th>Workflow</th>
            <th>Run ID</th>
            <th>Started</th>
            <th>Duration</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {workflows.length === 0 ? (
            <tr>
              <td colSpan={6} className='empty-state'>
                No workflows found
              </td>
            </tr>
          ) : (
            workflows.map((workflow) => (
              <tr key={workflow.id} onClick={() => navigate(`/workflows/${workflow.id}`)} className='workflow-row'>
                <td>
                  <StatusBadge status={workflow.status} />
                </td>
                <td className='workflow-name'>{workflow.workflowKey}</td>
                <td className='run-id'>{workflow.id.slice(0, 8)}</td>
                <td>{workflow.startedAt ? formatDate(workflow.startedAt) : '-'}</td>
                <td>{formatDuration(workflow.startedAt, workflow.completedAt)}</td>
                <td>{workflow.initiatedByUserId?.slice(0, 8) || 'System'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className='pagination'>
          <button disabled={page === 1} onClick={() => onPageChange(page - 1)} className='btn-secondary'>
            Previous
          </button>
          <span className='pagination-info'>
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className='btn-secondary'>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
