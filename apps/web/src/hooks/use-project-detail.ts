import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getProject, updateProject } from '../api/projects-api'
import type { UpdateProjectDto } from '../api/types/projects'
import { useOrganization } from '../contexts/organization-context'

export function useProjectDetail(projectId: string) {
  const { activeOrgId } = useOrganization()

  return useQuery({
    queryKey: ['projects', 'detail', activeOrgId, projectId],
    queryFn: async () => {
      if (!activeOrgId || !projectId) throw new Error('Missing organization or project ID')
      return getProject(activeOrgId, projectId)
    },
    enabled: !!activeOrgId && !!projectId,
    staleTime: 60000, // 1 min
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { activeOrgId } = useOrganization()

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: UpdateProjectDto }) => {
      if (!activeOrgId) throw new Error('No active organization')
      return updateProject(activeOrgId, projectId, data)
    },
    onSuccess: (updatedProject) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['projects', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'detail', activeOrgId, updatedProject.id] })
    },
  })
}
