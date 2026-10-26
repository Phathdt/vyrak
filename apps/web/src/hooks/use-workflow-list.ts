import { useWorkflowsControllerListWorkflowRuns } from '../api/generated'
import { useOrganization } from '../contexts/organization-context'

interface UseWorkflowListParams {
  projectId?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export function useWorkflowList(params: UseWorkflowListParams) {
  const { projectId, status, page = 1, limit = 20 } = params
  const { activeOrgId } = useOrganization()

  return useWorkflowsControllerListWorkflowRuns(
    activeOrgId || '',
    {
      projectId,
      status: status as 'queued' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled' | undefined,
      page,
      limit,
    },
    {
      query: {
        queryKey: ['workflows', 'list', activeOrgId, projectId, status, page, limit],
        enabled: !!activeOrgId,
        staleTime: 5000,
        refetchInterval: 10000,
      },
    }
  )
}
