import { useParams } from 'react-router-dom'

import { StepTimeline } from '../../components/workflow/StepTimeline'
import { WorkflowOverview } from '../../components/workflow/WorkflowOverview'
import { useWorkflowDetail } from '../../hooks/use-workflow-detail'
import { useWorkflowSSE } from '../../hooks/use-workflow-sse'

export function WorkflowDetailPage() {
  const { runId } = useParams<{ runId: string }>()

  if (!runId) {
    return <div>Invalid workflow run ID</div>
  }

  const { data: workflow, isLoading, error } = useWorkflowDetail(runId)
  const { connected } = useWorkflowSSE(runId)

  if (isLoading) {
    return (
      <div className='page-loading'>
        <div className='loading-spinner' />
        <p>Loading workflow details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='page-error'>
        <p>Error loading workflow: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }

  if (!workflow) {
    return <div>Workflow not found</div>
  }

  return (
    <div className='workflow-detail-page'>
      <header className='page-header'>
        <h1>{workflow.workflowKey}</h1>
        {connected && <span className='live-indicator'>🔴 Live</span>}
      </header>

      <WorkflowOverview workflow={workflow} />

      <section className='workflow-section'>
        <h2>Step Timeline</h2>
        <StepTimeline steps={workflow.steps} />
      </section>
    </div>
  )
}
