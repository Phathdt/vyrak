import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { customInstance, getErrorMessage } from '@/api/client'
import { useWorkflowExecutionControllerGetImplementationStatus } from '@/api/generated/workflows-execution/workflows-execution'
import { useWorkflowsControllerFindOne } from '@/api/generated/workflows/workflows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImplementationProgress } from '@/components/workflows/implementation-progress'
import { routes } from '@/lib/routes'

type PhaseSummary = {
  key: string
  name: string
  status: string
}

const POLL_INTERVAL_MS = 5000

export function ImplementationWorkspacePage() {
  const { orgId, projectId, workflowId } = useParams<{
    orgId: string
    projectId: string
    workflowId: string
  }>()

  const enabled = !!orgId && !!projectId && !!workflowId

  const {
    data: workflow,
    isLoading: isLoadingWorkflow,
    isError: isWorkflowError,
  } = useWorkflowsControllerFindOne(orgId!, projectId!, workflowId!, { query: { enabled } })

  const { data: phasesData } = useQuery({
    queryKey: ['workflow-phases', orgId, projectId, workflowId],
    enabled,
    queryFn: () =>
      customInstance<{ items: PhaseSummary[] }>({
        url: `/api/organizations/${orgId}/projects/${projectId}/workflows/${workflowId}/phases`,
        method: 'GET',
      }),
  })

  const implementationPhase = phasesData?.items.find((phase) => phase.key === 'implementation')
  const isPhaseInProgress = implementationPhase?.status === 'IN_PROGRESS'

  const {
    data: status,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    error: statusError,
  } = useWorkflowExecutionControllerGetImplementationStatus(orgId!, projectId!, workflowId!, {
    query: {
      enabled,
      refetchInterval: (query) => {
        if (!isPhaseInProgress) return false
        const data = query.state.data
        if (!data) return POLL_INTERVAL_MS
        const allDone = data.totalTasks > 0 && data.completedTasks === data.totalTasks
        return allDone ? false : POLL_INTERVAL_MS
      },
    },
  })

  const projectWorkflowsPath = orgId && projectId ? routes.projectWorkflows(orgId, projectId) : routes.dashboard()
  const workflowDetailPath =
    orgId && projectId && workflowId ? routes.workflowDetail(orgId, projectId, workflowId) : routes.dashboard()
  const artifactsPath = workflowDetailPath

  return (
    <div className='space-y-6 p-6'>
      <nav aria-label='Breadcrumb' className='flex items-center gap-1 text-sm text-muted-foreground'>
        <Link to={routes.dashboard()} className='hover:text-foreground'>
          Dashboard
        </Link>
        <ChevronRight className='size-4' />
        <Link to={projectWorkflowsPath} className='hover:text-foreground'>
          Workflows
        </Link>
        <ChevronRight className='size-4' />
        <Link to={workflowDetailPath} className='hover:text-foreground'>
          {workflow?.title ?? 'Workflow'}
        </Link>
        <ChevronRight className='size-4' />
        <span className='text-foreground'>Implementation</span>
      </nav>

      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold'>{workflow?.title ?? 'Implementation'}</h1>
          <div className='flex items-center gap-2 text-sm text-muted-foreground'>
            <span>Implementation phase</span>
            {implementationPhase && <Badge variant='outline'>{implementationPhase.status}</Badge>}
          </div>
        </div>
        <Button variant='outline' render={<Link to={artifactsPath} />}>
          View Artifacts
        </Button>
      </div>

      {isWorkflowError && (
        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
          Failed to load workflow.
        </div>
      )}

      {isLoadingWorkflow && <div className='text-sm text-muted-foreground'>Loading workflow...</div>}

      <ImplementationProgress
        status={status}
        isLoading={isLoadingStatus}
        isError={isStatusError}
        errorMessage={statusError ? getErrorMessage(statusError) : null}
      />
    </div>
  )
}
