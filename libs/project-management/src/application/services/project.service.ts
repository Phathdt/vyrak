import { BadRequestException, NotFoundException } from '@nestjs/common'

import type {
  CreateProjectDto,
  IProjectRepository,
  IProjectService,
  ListProjectsQueryDto,
  PaginatedProjects,
  ProjectWithStats,
  UpdateProjectDto,
} from '../../domain'

export class ProjectService implements IProjectService {
  constructor(private readonly repository: IProjectRepository) {}

  async create(organizationId: string, data: CreateProjectDto): Promise<ProjectWithStats> {
    const existing = await this.repository.findBySlug(organizationId, data.slug)

    if (existing) {
      throw new BadRequestException('Project slug already exists in this organization')
    }

    return this.repository.create(organizationId, data)
  }

  async findAll(organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedProjects> {
    return this.repository.findAll(organizationId, query)
  }

  async findOne(organizationId: string, id: string): Promise<ProjectWithStats> {
    const project = await this.repository.findOne(organizationId, id)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    return project
  }

  async update(organizationId: string, id: string, data: UpdateProjectDto): Promise<ProjectWithStats> {
    const existing = await this.repository.findOne(organizationId, id)

    if (!existing) {
      throw new NotFoundException('Project not found')
    }

    return this.repository.update(organizationId, id, data)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const existing = await this.repository.findOne(organizationId, id)

    if (!existing) {
      throw new NotFoundException('Project not found')
    }

    const activeRuns = await this.repository.countActiveWorkflowRuns(id)

    if (activeRuns > 0) {
      throw new BadRequestException(`Cannot delete project with ${activeRuns} active workflow run(s)`)
    }

    await this.repository.delete(organizationId, id)
  }
}
