import type {
  CreateProjectDto,
  IProjectRepository,
  ListProjectsQueryDto,
  PaginatedProjects,
  ProjectWithStats,
  UpdateProjectDto,
} from '../../domain'
import type { DatabaseService, Prisma } from '@vyrak/database'

type ProjectWithCount = Prisma.ProjectGetPayload<{
  include: {
    _count: {
      select: {
        gitRepositories: true
        workflowRuns: true
      }
    }
  }
}>

export class ProjectPrismaRepository implements IProjectRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(organizationId: string, data: CreateProjectDto): Promise<ProjectWithStats> {
    return this.prisma.withSystemAccess(async () => {
      const project = await this.prisma.client.project.create({
        data: {
          organizationId,
          name: data.name,
          slug: data.slug,
          description: data.description,
        },
        include: {
          _count: {
            select: {
              gitRepositories: true,
              workflowRuns: true,
            },
          },
        },
      })

      return {
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        stats: {
          repositoryCount: project._count.gitRepositories,
          workflowRunCount: project._count.workflowRuns,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }
    })
  }

  async findAll(organizationId: string, query: ListProjectsQueryDto): Promise<PaginatedProjects> {
    return this.prisma.withSystemAccess(async () => {
      const { page = 1, limit = 10, search, sort = 'createdAt', order = 'desc' } = query

      const where = {
        organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { slug: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [items, total] = await Promise.all([
        this.prisma.client.project.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sort]: order },
          include: {
            _count: {
              select: {
                gitRepositories: true,
                workflowRuns: true,
              },
            },
          },
        }),
        this.prisma.client.project.count({ where }),
      ])

      return {
        items: items.map((project: ProjectWithCount): ProjectWithStats => ({
          id: project.id,
          organizationId: project.organizationId,
          name: project.name,
          slug: project.slug,
          description: project.description,
          stats: {
            repositoryCount: project._count.gitRepositories,
            workflowRunCount: project._count.workflowRuns,
          },
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    })
  }

  async findOne(organizationId: string, id: string): Promise<ProjectWithStats | null> {
    return this.prisma.withSystemAccess(async () => {
      const project = await this.prisma.client.project.findUnique({
        where: {
          id,
          organizationId,
        },
        include: {
          _count: {
            select: {
              gitRepositories: true,
              workflowRuns: true,
            },
          },
        },
      })

      if (!project) {
        return null
      }

      return {
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        stats: {
          repositoryCount: project._count.gitRepositories,
          workflowRunCount: project._count.workflowRuns,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }
    })
  }

  async findBySlug(organizationId: string, slug: string): Promise<{ id: string } | null> {
    return this.prisma.withSystemAccess(async () => {
      return this.prisma.client.project.findUnique({
        where: {
          organizationId_slug: {
            organizationId,
            slug,
          },
        },
        select: { id: true },
      })
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
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
        include: {
          _count: {
            select: {
              gitRepositories: true,
              workflowRuns: true,
            },
          },
        },
      })

      return {
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        stats: {
          repositoryCount: project._count.gitRepositories,
          workflowRunCount: project._count.workflowRuns,
        },
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }
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

  async countActiveWorkflowRuns(projectId: string): Promise<number> {
    return this.prisma.withSystemAccess(async () => {
      return this.prisma.client.workflowRun.count({
        where: {
          projectId,
          status: { in: ['pending', 'running'] },
        },
      })
    })
  }
}
