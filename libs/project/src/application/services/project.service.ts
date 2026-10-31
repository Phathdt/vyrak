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

  async create(_organizationId: string, data: CreateProjectDto): Promise<ProjectWithStats> {
    const existing = await this.repository.findBySlug(data.slug)

    if (existing) {
      throw new BadRequestException('Project slug already exists in this organization')
    }

    return this.repository.create(data)
  }

  async findAll(_organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedProjects> {
    return this.repository.findAll(query)
  }

  async findOne(_organizationId: string, id: string): Promise<ProjectWithStats> {
    const project = await this.repository.findOne(id)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    return project
  }

  async update(_organizationId: string, id: string, data: UpdateProjectDto): Promise<ProjectWithStats> {
    const existing = await this.repository.findOne(id)

    if (!existing) {
      throw new NotFoundException('Project not found')
    }

    return this.repository.update(id, data)
  }

  async delete(_organizationId: string, id: string): Promise<void> {
    const existing = await this.repository.findOne(id)

    if (!existing) {
      throw new NotFoundException('Project not found')
    }

    await this.repository.delete(id)
  }
}
