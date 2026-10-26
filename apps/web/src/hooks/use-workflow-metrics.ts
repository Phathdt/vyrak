import { useMetricsControllerGetMetrics } from '../api/generated'
import { useAuth } from '../contexts/auth-context'

interface UseWorkflowMetricsParams {
  projectId?: string
  from?: string
  to?: string
}

export function useWorkflowMetrics(params: UseWorkflowMetricsParams = {}) {
  const { projectId, from, to } = params
  const { organizations } = useAuth()

  // Get first organization ID or use a placeholder
  const organizationId = organizations?.[0]?.id || 'default-org'

  return useMetricsControllerGetMetrics(
    {
      organizationId,
      projectId,
      from,
      to,
    },
    {
      query: {
        queryKey: ['workflow-metrics', organizationId, projectId, from, to],
        staleTime: 30000, // 30 seconds
      },
    }
  )
}
