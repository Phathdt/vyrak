import { useQuery } from '@tanstack/react-query'

import { listProjects } from '../api/projects-api'
import { useOrganization } from '../contexts/organization-context'

import type { ListProjectsParams } from '../api/types/projects'

export type SortOption = 'name' | '-name' | 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt'

interface UseProjectListParams {
  page?: number
  limit?: number
  search?: string
  sort?: SortOption
}

export function useProjectList(params: UseProjectListParams = {}) {
  const { page = 1, limit = 20, search, sort = '-createdAt' } = params
  const { activeOrgId } = useOrganization()

  // Parse sort format: '-fieldName' means desc, 'fieldName' means asc
  const parseSortAndOrder = (sortValue: SortOption): { sort: string; order: 'asc' | 'desc' } => {
    if (sortValue.startsWith('-')) {
      return { sort: sortValue.slice(1), order: 'desc' }
    }
    return { sort: sortValue, order: 'asc' }
  }

  const { sort: sortField, order } = parseSortAndOrder(sort)

  return useQuery({
    queryKey: ['projects', 'list', activeOrgId, page, limit, search, sort],
    queryFn: async () => {
      if (!activeOrgId) throw new Error('No active organization')

      const queryParams: ListProjectsParams = {
        page,
        limit,
        search: search || undefined, // Don't send empty string
        sort: sortField as 'name' | 'createdAt' | 'updatedAt',
        order,
      }

      return listProjects(activeOrgId, queryParams)
    },
    enabled: !!activeOrgId,
    staleTime: 30000, // 30s
  })
}
