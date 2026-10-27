import type {
  CreateProjectDto,
  ListProjectsQueryDto,
  PaginatedProjects,
  ProjectWithStats,
  UpdateProjectDto,
} from '../schemas'

export interface IProjectRepository {
  create(organizationId: string, data: CreateProjectDto): Promise<ProjectWithStats>
  findAll(organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedProjects>
  findOne(organizationId: string, id: string): Promise<ProjectWithStats | null>
  findBySlug(organizationId: string, slug: string): Promise<{ id: string } | null>
  update(organizationId: string, id: string, data: UpdateProjectDto): Promise<ProjectWithStats>
  delete(organizationId: string, id: string): Promise<void>
  countActiveWorkflowRuns(projectId: string): Promise<number>
}
