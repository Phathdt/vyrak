import { useQueryClient } from '@tanstack/react-query'

import { useWorkflowsControllerCancelWorkflow } from '../api/generated'
import { useOrganization } from '../contexts/organization-context'

interface CancelWorkflowOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useWorkflowCancel(runId: string, options?: CancelWorkflowOptions) {
  const { activeOrgId } = useOrganization()
  const queryClient = useQueryClient()

  const cancelMutation = useWorkflowsControllerCancelWorkflow()

  const cancelWorkflow = async (reason?: string) => {
    if (!activeOrgId) {
      throw new Error('No active organization')
    }

    // Check current status before cancelling
    const currentData = queryClient.getQueryData(['workflow-run', activeOrgId, runId]) as unknown as Record<
      string,
      unknown
    >

    if (currentData) {
      const terminalStates = ['succeeded', 'failed', 'cancelled']
      const status = String(currentData.status)
      if (terminalStates.includes(status)) {
        throw new Error(`Cannot cancel workflow: it has already ${status === 'cancelled' ? 'been cancelled' : status}`)
      }
    }

    // Optimistic update: set status to "cancelling"
    queryClient.setQueryData(['workflow-run', activeOrgId, runId], (old: unknown) => {
      if (!old) return old
      return {
        ...(old as Record<string, unknown>),
        status: 'cancelling',
      }
    })

    try {
      // Call API with comment field (maps to reason)
      await cancelMutation.mutateAsync({
        orgId: activeOrgId,
        runId,
        data: reason ? { comment: reason } : { comment: undefined },
      })

      // Invalidate queries to refetch latest state
      queryClient.invalidateQueries({ queryKey: ['workflow-run', activeOrgId, runId] })
      queryClient.invalidateQueries({ queryKey: ['workflow-steps', activeOrgId, runId] })
      queryClient.invalidateQueries({ queryKey: ['workflows', 'list'] })

      options?.onSuccess?.()
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['workflow-run', activeOrgId, runId] })

      // Handle specific error cases
      const err = error as unknown as Record<string, unknown>
      if (err.status === 409 || (err.response as Record<string, unknown>)?.status === 409) {
        // Backend says workflow already in terminal state
        const message =
          ((err.response as Record<string, unknown>)?.data as Record<string, unknown>)?.message ||
          'Workflow has already completed'
        options?.onError?.(new Error(String(message)))
        throw new Error(String(message))
      }

      options?.onError?.(error as Error)
      throw error
    }
  }

  return {
    cancelWorkflow,
    isLoading: cancelMutation.isPending,
    error: cancelMutation.error,
    reset: cancelMutation.reset,
  }
}
