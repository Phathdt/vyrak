import { useWorkflowsControllerListWorkflowRuns } from '../api/generated'

interface UseApprovalsParams {
  status?: string
}

export function useApprovals(params: UseApprovalsParams = {}) {
  const { status = 'waiting_approval' } = params

  return useWorkflowsControllerListWorkflowRuns(
    {
      status: status as 'queued' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled' | undefined,
      limit: 100,
    },
    {
      query: {
        queryKey: ['approvals', status],
        staleTime: 5000,
        refetchInterval: 10000,
      },
    }
  )
}
