import type {
  CreateProjectDto,
  ListProjectsQueryDto,
  PaginatedProjects,
  ProjectWithStats,
  UpdateProjectDto,
} from '../schemas'

export interface IProjectRepository {
  create(data: CreateProjectDto): Promise<ProjectWithStats>
  findAll(query: ListProjectsQueryDto): Promise<PaginatedProjects>
  findOne(id: string): Promise<ProjectWithStats | null>
  findBySlug(slug: string): Promise<{ id: string } | null>
  update(id: string, data: UpdateProjectDto): Promise<ProjectWithStats>
  delete(id: string): Promise<void>
}
