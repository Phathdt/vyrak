import { useQueryClient } from '@tanstack/react-query'

import { useWorkflowsControllerApproveWorkflow, useWorkflowsControllerRejectWorkflow } from '../api/generated'

export function useApprovalActions() {
  const queryClient = useQueryClient()

  const approveMutation = useWorkflowsControllerApproveWorkflow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        queryClient.invalidateQueries({ queryKey: ['workflow-run'] })
        queryClient.invalidateQueries({ queryKey: ['workflows'] })
      },
    },
  })

  const rejectMutation = useWorkflowsControllerRejectWorkflow({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['approvals'] })
        queryClient.invalidateQueries({ queryKey: ['workflow-run'] })
        queryClient.invalidateQueries({ queryKey: ['workflows'] })
      },
    },
  })

  return {
    approve: async ({ runId, comment }: { runId: string; comment?: string }) => {
      return approveMutation.mutateAsync({ runId, data: { comment } })
    },
    reject: async ({ runId, comment }: { runId: string; comment: string }) => {
      return rejectMutation.mutateAsync({ runId, data: { comment } })
    },
    isLoading: approveMutation.isPending || rejectMutation.isPending,
  }
}
