import { useWorkflowsControllerGetSteps, useWorkflowsControllerGetWorkflowRun } from '../api/generated'
import { useOrganization } from '../contexts/organization-context'

export function useWorkflowDetail(runId: string) {
  const { activeOrgId } = useOrganization()

  const runQuery = useWorkflowsControllerGetWorkflowRun(activeOrgId || '', runId, {
    query: {
      queryKey: ['workflow-run', activeOrgId, runId],
      enabled: !!activeOrgId,
      staleTime: 5000,
      refetchInterval: (query: { state: { data?: { status: string } } }) => {
        // Stop refetching if workflow is in terminal state
        const data = query.state.data
        if (data && ['succeeded', 'failed', 'cancelled'].includes(data.status)) {
          return false
        }
        return 10000
      },
    },
  })

  const stepsQuery = useWorkflowsControllerGetSteps(activeOrgId || '', runId, {
    query: {
      queryKey: ['workflow-steps', activeOrgId, runId],
      enabled: !!activeOrgId && !!runId,
      staleTime: 5000,
      refetchInterval: (query: { state: { data?: Array<{ status: string }> } }) => {
        // Stop refetching if all steps are in terminal state
        const data = query.state.data
        const allCompleted = data?.every((step: { status: string }) =>
          ['succeeded', 'failed', 'skipped'].includes(step.status)
        )
        return allCompleted ? false : 10000
      },
    },
  })

  return {
    data: runQuery.data
      ? {
          ...runQuery.data,
          steps: stepsQuery.data || [],
        }
      : undefined,
    isLoading: runQuery.isLoading || stepsQuery.isLoading,
    error: runQuery.error || stepsQuery.error,
  }
}
