import { useWorkflowsControllerListWorkflowRuns } from '../api/generated/workflows/workflows'

/**
 * Real-time count of workflows waiting for approval
 * Used for badge count on navigation and dashboard
 */
export function useApprovalCount(orgId: string) {
  const { data, isLoading, error } = useWorkflowsControllerListWorkflowRuns(
    orgId,
    {
      status: 'waiting_approval',
      page: 1,
      limit: 1, // Only need count, not full list
    },
    {
      query: {
        refetchInterval: 30000, // Refetch every 30 seconds
        staleTime: 25000, // Data fresh for 25 seconds
      },
    }
  )

  return {
    count: data?.total ?? 0,
    isLoading,
    error,
  }
}
