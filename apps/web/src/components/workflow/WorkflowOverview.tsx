import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { StatusBadge } from './StatusBadge'

import type { StepRunResponseDto, WorkflowRunResponseDto } from '../../api/generated/models'

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
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card className='p-4'>
          <label className='text-sm text-muted-foreground'>Status</label>
          <div className='mt-2'>
            <StatusBadge status={workflow.status} />
          </div>
        </Card>

        <Card className='p-4'>
          <label className='text-sm text-muted-foreground'>Progress</label>
          <div className='mt-2 space-y-2'>
            <div className='h-2 w-full overflow-hidden rounded-full bg-secondary'>
              <div className='h-full bg-accent-cyan transition-all' style={{ width: `${progress}%` }} />
            </div>
            <span className='text-sm'>
              {completedSteps} / {totalSteps} steps
            </span>
          </div>
        </Card>

        <Card className='p-4'>
          <label className='text-sm text-muted-foreground'>Started</label>
          <div className='mt-2 text-sm'>{workflow.startedAt ? formatDateTime(workflow.startedAt) : 'Not started'}</div>
        </Card>

        <Card className='p-4'>
          <label className='text-sm text-muted-foreground'>Duration</label>
          <div className='mt-2 text-sm'>
            {workflow.startedAt ? formatDuration(workflow.startedAt, workflow.completedAt) : '-'}
          </div>
        </Card>

        <Card className='p-4'>
          <label className='text-sm text-muted-foreground'>Run ID</label>
          <div className='mt-2 font-mono text-sm'>{workflow.id}</div>
        </Card>

        <Card className='p-4'>
          <label className='text-sm text-muted-foreground'>Initiated By</label>
          <div className='mt-2 text-sm'>{workflow.initiatedByUserId.slice(0, 8)}</div>
        </Card>
      </div>

      {workflow.status === 'running' && (
        <div className='flex justify-end'>
          <Button variant='destructive'>Cancel Workflow</Button>
        </div>
      )}
    </div>
  )
}
