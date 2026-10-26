import { useWorkflowsControllerListWorkflowRuns } from '../api/generated'
import { useOrganization } from '../contexts/organization-context'

interface UseApprovalsParams {
  status?: string
}

export function useApprovals(params: UseApprovalsParams = {}) {
  const { status = 'waiting_approval' } = params
  const { activeOrgId } = useOrganization()

  return useWorkflowsControllerListWorkflowRuns(
    activeOrgId || '',
    {
      status: status as 'queued' | 'running' | 'waiting_approval' | 'succeeded' | 'failed' | 'cancelled' | undefined,
      limit: 100,
    },
    {
      query: {
        queryKey: ['approvals', activeOrgId, status],
        enabled: !!activeOrgId,
        staleTime: 5000,
        refetchInterval: 10000,
      },
    }
  )
}
