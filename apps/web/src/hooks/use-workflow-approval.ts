import { useQueryClient } from '@tanstack/react-query'

import {
  getWorkflowsControllerGetWorkflowRunQueryKey,
  useWorkflowsControllerApproveWorkflow,
  useWorkflowsControllerRejectWorkflow,
} from '../api/generated/workflows/workflows'

interface WorkflowApprovalOptions {
  orgId: string
  runId: string
}

/**
 * Hook for approving workflow with optimistic updates
 * Approval advances workflow to running state
 */
export function useApproveWorkflow({ orgId, runId }: WorkflowApprovalOptions) {
  const queryClient = useQueryClient()
  const workflowQueryKey = getWorkflowsControllerGetWorkflowRunQueryKey(orgId, runId)

  const { mutateAsync: approveMutation, isPending } = useWorkflowsControllerApproveWorkflow()

  const approve = async (data: { comment?: string }) => {
    // Optimistic update: immediately update workflow status
    const previousData = queryClient.getQueryData(workflowQueryKey)

    queryClient.setQueryData(workflowQueryKey, (old: unknown) => {
      if (!old) return old
      return {
        ...(old as Record<string, unknown>),
        status: 'running',
        // Note: approval metadata will come from backend on refetch
      }
    })

    try {
      // Call API
      await approveMutation({
        orgId,
        runId,
        data,
      })

      // Success: refetch to get approval metadata
      await queryClient.invalidateQueries({ queryKey: workflowQueryKey })

      return { success: true }
    } catch (error: unknown) {
      // Rollback optimistic update
      queryClient.setQueryData(workflowQueryKey, previousData)

      const err = error as { response?: { status?: number; data?: { message?: string } } }

      // Handle specific error cases
      if (err?.response?.status === 409) {
        // Already approved by another user
        await queryClient.invalidateQueries({ queryKey: workflowQueryKey })
        throw new Error('CONFLICT')
      }

      if (err?.response?.status === 400) {
        // Invalid state (not waiting_approval)
        await queryClient.invalidateQueries({ queryKey: workflowQueryKey })
        throw new Error('INVALID_STATE')
      }

      // Generic error
      throw new Error(err?.response?.data?.message || 'Failed to approve workflow')
    }
  }

  return {
    approve,
    isApproving: isPending,
  }
}

/**
 * Hook for rejecting workflow with optimistic updates
 * Rejection is terminal - workflow moves to cancelled state
 */
export function useRejectWorkflow({ orgId, runId }: WorkflowApprovalOptions) {
  const queryClient = useQueryClient()
  const workflowQueryKey = getWorkflowsControllerGetWorkflowRunQueryKey(orgId, runId)

  const { mutateAsync: rejectMutation, isPending } = useWorkflowsControllerRejectWorkflow()

  const reject = async (reason: string) => {
    // Optimistic update: immediately update workflow status
    const previousData = queryClient.getQueryData(workflowQueryKey)

    queryClient.setQueryData(workflowQueryKey, (old: unknown) => {
      if (!old) return old
      return {
        ...(old as Record<string, unknown>),
        status: 'cancelled',
        cancellationReason: reason,
        // Note: rejection metadata will come from backend on refetch
      }
    })

    try {
      // Call API (backend expects 'comment' field for rejection reason)
      await rejectMutation({
        orgId,
        runId,
        data: {
          comment: reason,
        },
      })

      // Success: refetch to get rejection metadata
      await queryClient.invalidateQueries({ queryKey: workflowQueryKey })

      return { success: true }
    } catch (error: unknown) {
      // Rollback optimistic update
      queryClient.setQueryData(workflowQueryKey, previousData)

      const err = error as { response?: { status?: number; data?: { message?: string } } }

      // Handle specific error cases
      if (err?.response?.status === 409) {
        // Already approved - cannot reject
        await queryClient.invalidateQueries({ queryKey: workflowQueryKey })
        throw new Error('ALREADY_APPROVED')
      }

      if (err?.response?.status === 400) {
        // Invalid state (not waiting_approval)
        await queryClient.invalidateQueries({ queryKey: workflowQueryKey })
        throw new Error('INVALID_STATE')
      }

      // Generic error
      throw new Error(err?.response?.data?.message || 'Failed to reject workflow')
    }
  }

  return {
    reject,
    isRejecting: isPending,
  }
}
