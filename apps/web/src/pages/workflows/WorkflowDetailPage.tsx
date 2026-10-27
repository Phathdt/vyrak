import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { StepTimeline } from '../../components/workflow/StepTimeline'
import { WorkflowOverview } from '../../components/workflow/WorkflowOverview'
import { useWorkflowDetail } from '../../hooks/use-workflow-detail'
import { useWorkflowSSE } from '../../hooks/use-workflow-sse'

export function WorkflowDetailPage() {
  const { runId } = useParams<{ runId: string }>()

  // Call hooks unconditionally
  const { data: workflow, isLoading, error } = useWorkflowDetail(runId || '')
  const { connected } = useWorkflowSSE(runId || '')

  if (!runId) {
    return (
      <div className='container py-8'>
        <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
          Invalid workflow run ID
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='container py-8'>
        <div className='flex flex-col items-center justify-center py-16'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          <p className='mt-4 text-muted-foreground'>Loading workflow details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='container py-8'>
        <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive'>
          <p>Error loading workflow: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className='container py-8'>
        <div className='rounded-lg border p-4 text-muted-foreground'>Workflow not found</div>
      </div>
    )
  }

  return (
    <div className='container py-8'>
      <header className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>{workflow.workflowKey}</h1>
          <p className='mt-2 text-muted-foreground'>Run ID: {workflow.id}</p>
        </div>
        {connected && (
          <Badge variant='default' className='gap-1.5'>
            <span className='h-2 w-2 animate-pulse rounded-full bg-red-500' />
            Live
          </Badge>
        )}
      </header>

      <div className='space-y-8'>
        <WorkflowOverview workflow={workflow} />

        <section>
          <h2 className='mb-4 text-xl font-semibold'>Step Timeline</h2>
          <StepTimeline steps={workflow.steps} />
        </section>
      </div>
    </div>
  )
}
