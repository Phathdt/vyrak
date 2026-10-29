import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { useDurationCounter } from '../../hooks/use-duration-counter'
import { formatAbsoluteTime, formatDuration, formatRelativeTime } from '../../lib/utils/duration-utils'

import type { StepRunResponseDto, WorkflowRunResponseDto } from '../../api/generated/models'

interface WorkflowOverviewProps {
  workflow: WorkflowRunResponseDto & {
    steps: StepRunResponseDto[]
  }
}

export function WorkflowOverview({ workflow }: WorkflowOverviewProps) {
  const isRunning = workflow.status === 'running' || workflow.status === 'queued'
  const duration = useDurationCounter(workflow.startedAt, workflow.completedAt, isRunning)

  const copyRunId = () => {
    navigator.clipboard.writeText(workflow.id)
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* Project Card */}
        <Card className='flex gap-4 p-4'>
          <div className='text-2xl'>📁</div>
          <div className='flex-1'>
            <label className='text-xs text-muted-foreground'>Project</label>
            <div className='mt-1'>
              <a
                href={`/projects/${workflow.projectId}`}
                className='text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:underline'
              >
                {workflow.projectId.slice(0, 12)}...
              </a>
            </div>
          </div>
        </Card>

        {/* Repository Card */}
        <Card className='flex gap-4 p-4'>
          <div className='text-2xl'>🔷</div>
          <div className='flex-1'>
            <label className='text-xs text-muted-foreground'>Workflow Key</label>
            <div className='mt-1 text-sm font-medium text-foreground'>{workflow.workflowKey}</div>
          </div>
        </Card>

        {/* Started Card */}
        <Card className='flex gap-4 p-4'>
          <div className='text-2xl'>🕐</div>
          <div className='flex-1'>
            <label className='text-xs text-muted-foreground'>Started</label>
            {workflow.startedAt ? (
              <>
                <div className='mt-1 text-sm font-medium text-foreground'>{formatRelativeTime(workflow.startedAt)}</div>
                <div className='mt-0.5 text-xs text-muted-foreground' title={formatAbsoluteTime(workflow.startedAt)}>
                  {formatAbsoluteTime(workflow.startedAt)}
                </div>
              </>
            ) : (
              <div className='mt-1 text-sm text-muted-foreground'>Not started</div>
            )}
          </div>
        </Card>

        {/* Duration Card */}
        <Card className='flex gap-4 p-4'>
          <div className='text-2xl'>⏱️</div>
          <div className='flex-1'>
            <label className='text-xs text-muted-foreground'>Duration</label>
            {duration !== null ? (
              <div className={`mt-1 text-sm font-medium ${isRunning ? 'text-cyan-400' : 'text-foreground'}`}>
                {formatDuration(duration)}
              </div>
            ) : (
              <div className='mt-1 text-sm text-muted-foreground'>-</div>
            )}
          </div>
        </Card>

        {/* Initiated By Card */}
        <Card className='flex gap-4 p-4'>
          <div className='text-2xl'>👤</div>
          <div className='flex-1'>
            <label className='text-xs text-muted-foreground'>Initiated By</label>
            <div className='mt-1 text-sm font-medium text-foreground'>{workflow.initiatedByUserId.slice(0, 8)}...</div>
          </div>
        </Card>

        {/* Run ID Card */}
        <Card className='flex gap-4 p-4'>
          <div className='text-2xl'>🔑</div>
          <div className='flex-1'>
            <label className='text-xs text-muted-foreground'>Run ID</label>
            <div className='mt-1 font-mono text-sm text-foreground'>{workflow.id.slice(0, 8)}...</div>
            <button onClick={copyRunId} className='mt-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline'>
              Copy full ID
            </button>
          </div>
        </Card>
      </div>

      {workflow.status === 'running' && (
        <div className='flex justify-end'>
          <Button variant='destructive' data-testid='workflow-cancel-button'>
            Cancel Workflow
          </Button>
        </div>
      )}
    </div>
  )
}
