import type {
  CreateProjectDto,
  ListProjectsQueryDto,
  PaginatedProjects,
  ProjectWithStats,
  UpdateProjectDto,
} from '../schemas'

export interface IProjectService {
  create(organizationId: string, data: CreateProjectDto): Promise<ProjectWithStats>
  findAll(organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedProjects>
  findOne(organizationId: string, id: string): Promise<ProjectWithStats>
  update(organizationId: string, id: string, data: UpdateProjectDto): Promise<ProjectWithStats>
  delete(organizationId: string, id: string): Promise<void>
}
