import { useWorkflowsControllerListWorkflowRuns } from '../api/generated'

interface UseWorkflowListParams {
  projectId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export function useWorkflowList(params: UseWorkflowListParams) {
  const { projectId, status, page = 1, limit = 20 } = params

  return useWorkflowsControllerListWorkflowRuns(
    {
      projectId,
      status: status as 'queued' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled' | undefined,
      page,
      limit,
    },
    {
      query: {
        queryKey: ['workflows', 'list', projectId, status, page, limit],
        staleTime: 5000,
        refetchInterval: 10000,
      },
    }
  )
}
