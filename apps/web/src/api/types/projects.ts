// Manual type definitions matching backend DTOs
// Will be replaced by Orval-generated types once nestjs-zod issue is resolved

export interface ProjectStats {
  repositoryCount: number
  workflowRunCount: number
}

export interface Project {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string | null
  stats: ProjectStats
  createdAt: string
  updatedAt: string
}

export interface CreateProjectDto {
  name: string
  slug: string
  description?: string
}

export interface UpdateProjectDto {
  name?: string
  description?: string | null
}

export interface ListProjectsParams {
  page?: number
  limit?: number
  search?: string
  sort?: 'name' | 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface PaginatedProjects {
  items: Project[]
  total: number
  page: number
  limit: number
  totalPages: number
}
