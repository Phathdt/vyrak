import { useWorkflowsControllerGetSteps, useWorkflowsControllerGetWorkflowRun } from '../api/generated'

export function useWorkflowDetail(runId: string) {
  const runQuery = useWorkflowsControllerGetWorkflowRun(runId, {
    query: {
      queryKey: ['workflow-run', runId],
      staleTime: 5000,
      refetchInterval: (query) => {
        // Stop refetching if workflow is in terminal state
        const data = query.state.data
        if (data && ['succeeded', 'failed', 'cancelled'].includes(data.status)) {
          return false
        }
        return 10000
      },
    },
  })

  const stepsQuery = useWorkflowsControllerGetSteps(runId, {
    query: {
      queryKey: ['workflow-steps', runId],
      enabled: !!runId,
      staleTime: 5000,
      refetchInterval: (query) => {
        // Stop refetching if all steps are in terminal state
        const data = query.state.data
        const allCompleted = data?.every((step) => ['succeeded', 'failed', 'skipped'].includes(step.status))
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
