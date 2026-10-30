import type {
  CreateProjectDto,
  IProjectRepository,
  ListProjectsQueryDto,
  PaginatedProjects,
  ProjectWithStats,
  UpdateProjectDto,
} from '../../domain'
import type { DatabaseService, Project as PrismaProject } from '@vyrak/database'

export class ProjectPrismaRepository implements IProjectRepository {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Map Prisma Project to ProjectWithStats
   * Centralized mapping to avoid duplication
   */
  private async mapToEntity(project: PrismaProject): Promise<ProjectWithStats> {
    const repositoryCount = await this.prisma.client.gitRepository.count({
      where: { projectId: project.id },
    })

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      stats: {
        repositoryCount,
        workflowRunCount: 0,
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }
  }

  async create(organizationId: string, data: CreateProjectDto): Promise<ProjectWithStats> {
    return this.prisma.withSystemAccess(async () => {
      const project = await this.prisma.client.project.create({
        data: {
          organizationId,
          name: data.name,
          slug: data.slug,
          description: data.description,
        },
      })

      return this.mapToEntity(project)
    })
  }

  async findOne(organizationId: string, id: string): Promise<ProjectWithStats | null> {
    return this.prisma.withSystemAccess(async () => {
      const project = await this.prisma.client.project.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      if (!project) {
        return null
      }

      return this.mapToEntity(project)
    })
  }

  async findBySlug(organizationId: string, slug: string): Promise<{ id: string } | null> {
    return this.prisma.withSystemAccess(async () => {
      const project = await this.prisma.client.project.findFirst({
        where: {
          slug,
          organizationId,
        },
        select: {
          id: true,
        },
      })

      return project
    })
  }

  async findAll(organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedProjects> {
    return this.prisma.withSystemAccess(async () => {
      const { page = 1, limit = 10, search } = query

      const where = {
        organizationId,
        ...(search && {
          OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { slug: { contains: search } }],
        }),
      }

      const [projects, total] = await Promise.all([
        this.prisma.client.project.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.client.project.count({ where }),
      ])

      const projectsWithStats = await Promise.all(projects.map((project) => this.mapToEntity(project)))

      return {
        items: projectsWithStats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    })
  }

  async update(organizationId: string, id: string, data: UpdateProjectDto): Promise<ProjectWithStats> {
    return this.prisma.withSystemAccess(async () => {
      const project = await this.prisma.client.project.update({
        where: {
          id,
          organizationId,
        },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
      })

      return this.mapToEntity(project)
    })
  }

  async delete(organizationId: string, id: string): Promise<void> {
    return this.prisma.withSystemAccess(async () => {
      await this.prisma.client.project.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
