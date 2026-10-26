import { useMetricsControllerGetMetrics } from '../api/generated'
import { useOrganization } from '../contexts/organization-context'

interface UseWorkflowMetricsParams {
  projectId?: string
  from?: string
  to?: string
}

export function useWorkflowMetrics(params: UseWorkflowMetricsParams = {}) {
  const { projectId, from, to } = params
  const { activeOrgId } = useOrganization()

  return useMetricsControllerGetMetrics(
    activeOrgId || '',
    {
      organizationId: activeOrgId || '',
      projectId,
      from,
      to,
    },
    {
      query: {
        queryKey: ['workflow-metrics', activeOrgId, projectId, from, to],
        enabled: !!activeOrgId,
        staleTime: 30000, // 30 seconds
      },
    }
  )
}
