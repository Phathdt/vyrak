import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useWorkflowList } from '@/hooks/use-workflow-list'

import type { WorkflowRunSummaryDto } from '@/api/generated/models'

interface RecentWorkflowsSectionProps {
  projectId: string
}

export function RecentWorkflowsSection({ projectId }: RecentWorkflowsSectionProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useWorkflowList({
    projectId,
    page: 1,
    limit: 5,
  })

  const workflows = data?.items || []

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(dateString))
  }

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return '-'
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    const duration = end - start
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const getStatusVariant = (status: string): 'success' | 'error' | 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'succeeded':
        return 'success'
      case 'failed':
        return 'error'
      case 'running':
        return 'default'
      case 'queued':
        return 'secondary'
      case 'cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Recent Workflows</h2>
        <Button variant='ghost' size='sm' onClick={() => navigate(`/workflows?projectId=${projectId}`)}>
          View All
          <svg className='w-4 h-4 ml-1' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className='py-12 text-center'>
            <div className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent' />
            <p className='text-sm text-muted-foreground mt-2'>Loading workflows...</p>
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='py-12 text-center'>
            <p className='text-muted-foreground'>No workflow runs yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-sm text-muted-foreground'>
                    <th className='p-4 font-medium'>Status</th>
                    <th className='p-4 font-medium'>Workflow</th>
                    <th className='p-4 font-medium'>Started</th>
                    <th className='p-4 font-medium'>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow: WorkflowRunSummaryDto) => (
                    <tr
                      key={workflow.id}
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                      className='border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors'
                    >
                      <td className='p-4'>
                        <Badge variant={getStatusVariant(workflow.status)}>{workflow.status}</Badge>
                      </td>
                      <td className='p-4 font-medium'>{workflow.workflowKey}</td>
                      <td className='p-4 text-sm text-muted-foreground'>{formatDate(workflow.startedAt)}</td>
                      <td className='p-4 text-sm text-muted-foreground'>
                        {formatDuration(workflow.startedAt, workflow.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
