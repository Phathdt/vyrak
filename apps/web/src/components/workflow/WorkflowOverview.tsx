import { StatusBadge } from './StatusBadge'

import { StepRunResponseDto, WorkflowRunResponseDto } from '../../api/generated/models'

interface WorkflowOverviewProps {
  workflow: WorkflowRunResponseDto & {
    steps: StepRunResponseDto[]
  }
}

export function WorkflowOverview({ workflow }: WorkflowOverviewProps) {
  const completedSteps = workflow.steps.filter((s: StepRunResponseDto) => s.status === 'succeeded').length
  const totalSteps = workflow.steps.length
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const formatDuration = (startedAt: string, completedAt?: string | null) => {
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

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(dateString))
  }

  return (
    <div className='workflow-overview'>
      <div className='overview-grid'>
        <div className='info-card'>
          <label>Status</label>
          <StatusBadge status={workflow.status} />
        </div>

        <div className='info-card'>
          <label>Progress</label>
          <div className='progress-bar'>
            <div className='progress-fill' style={{ width: `${progress}%` }} />
          </div>
          <span className='progress-text'>
            {completedSteps} / {totalSteps} steps
          </span>
        </div>

        <div className='info-card'>
          <label>Started</label>
          <span>{workflow.startedAt ? formatDateTime(workflow.startedAt) : 'Not started'}</span>
        </div>

        <div className='info-card'>
          <label>Duration</label>
          <span>{workflow.startedAt ? formatDuration(workflow.startedAt, workflow.completedAt) : '-'}</span>
        </div>

        <div className='info-card'>
          <label>Run ID</label>
          <span className='run-id'>{workflow.id}</span>
        </div>

        <div className='info-card'>
          <label>Initiated By</label>
          <span>{workflow.initiatedByUserId.slice(0, 8)}</span>
        </div>
      </div>

      {workflow.status === 'running' && (
        <div className='action-buttons'>
          <button className='btn-danger'>Cancel Workflow</button>
        </div>
      )}
    </div>
  )
}
