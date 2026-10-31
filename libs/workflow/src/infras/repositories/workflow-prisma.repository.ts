import { BaseTenantRepository, type Workflow, type Prisma } from '@vyrak/database'

import { WorkflowStatus } from '../../domain/entities'

import type {
  CreateWorkflowDto,
  IWorkflowRepository,
  ListWorkflowsQueryDto,
  PaginatedWorkflows,
  UpdateWorkflowDto,
  WorkflowWithRepositories,
} from '../../domain'
import type { WorkflowEntity, WorkflowType } from '../../domain/entities'

export class WorkflowPrismaRepository extends BaseTenantRepository implements IWorkflowRepository {
  private mapToEntity(raw: Workflow): WorkflowEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      projectId: raw.projectId,
      type: raw.type as WorkflowType | null,
      status: raw.status as WorkflowStatus,
      title: raw.title,
      description: raw.description,
      currentPhaseKey: raw.currentPhaseKey,
      definitionSnapshot: raw.definitionSnapshot as Record<string, unknown> | null,
      classification: raw.classification as Record<string, unknown> | null,
      classificationConfirmedAt: raw.classificationConfirmedAt,
      classificationConfirmedById: raw.classificationConfirmedById,
      createdById: raw.createdById,
      startedAt: raw.startedAt,
      completedAt: raw.completedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async create(projectId: string, createdById: string, data: CreateWorkflowDto): Promise<WorkflowWithRepositories> {
    return this.withTenantContext(async (organizationId) => {
      const workflow = await this.prisma.client.workflow.create({
        data: {
          organizationId,
          projectId,
          createdById,
          title: data.title,
          description: data.description ?? null,
          status: WorkflowStatus.DRAFT,
        },
      })

      await this.prisma.client.workflowRepository.createMany({
        data: data.repositoryIds.map((repositoryId) => ({
          organizationId,
          workflowId: workflow.id,
          repositoryId,
        })),
      })

      const repositories = await this.prisma.client.workflowRepository.findMany({
        where: {
          workflowId: workflow.id,
        },
        select: {
          id: true,
          repositoryId: true,
        },
      })

      return {
        ...this.mapToEntity(workflow),
        repositories,
      }
    })
  }

  async findAll(projectId: string, query: ListWorkflowsQueryDto): Promise<PaginatedWorkflows> {
    return this.withTenantContext(async (organizationId) => {
      const where: Prisma.WorkflowWhereInput = {
        organizationId,
        projectId,
      }

      if (query.search) {
        where.OR = [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ]
      }

      if (query.type) {
        where.type = query.type
      }

      if (query.status) {
        where.status = query.status
      }

      if (query.createdById) {
        where.createdById = query.createdById
      }

      const [workflows, total] = await Promise.all([
        this.prisma.client.workflow.findMany({
          where,
          orderBy: {
            [query.sort]: query.order,
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.client.workflow.count({ where }),
      ])

      // Fetch repositories for all workflows
      const workflowIds = workflows.map((w) => w.id)
      const repositories = await this.prisma.client.workflowRepository.findMany({
        where: {
          workflowId: { in: workflowIds },
        },
        select: {
          id: true,
          workflowId: true,
          repositoryId: true,
        },
      })

      // Group repositories by workflowId
      const reposByWorkflow = repositories.reduce(
        (acc, repo) => {
          if (!acc[repo.workflowId]) {
            acc[repo.workflowId] = []
          }
          acc[repo.workflowId].push({
            id: repo.id,
            repositoryId: repo.repositoryId,
          })
          return acc
        },
        {} as Record<string, Array<{ id: string; repositoryId: string }>>
      )

      const items = workflows.map((w) => ({
        ...this.mapToEntity(w),
        repositories: reposByWorkflow[w.id] || [],
      }))

      return {
        items,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      }
    })
  }

  async findOne(id: string): Promise<WorkflowWithRepositories | null> {
    return this.withTenantContext(async (organizationId) => {
      const workflow = await this.prisma.client.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      if (!workflow) {
        return null
      }

      const repositories = await this.prisma.client.workflowRepository.findMany({
        where: {
          workflowId: workflow.id,
        },
        select: {
          id: true,
          repositoryId: true,
        },
      })

      return {
        ...this.mapToEntity(workflow),
        repositories,
      }
    })
  }

  async update(id: string, data: UpdateWorkflowDto): Promise<WorkflowWithRepositories> {
    return this.withTenantContext(async (organizationId) => {
      const workflow = await this.prisma.client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: {
          title: data.title,
          description: data.description,
        },
      })

      const repositories = await this.prisma.client.workflowRepository.findMany({
        where: {
          workflowId: workflow.id,
        },
        select: {
          id: true,
          repositoryId: true,
        },
      })

      return {
        ...this.mapToEntity(workflow),
        repositories,
      }
    })
  }

  async delete(id: string): Promise<void> {
    return this.withTenantContext(async (organizationId) => {
      await this.prisma.client.$transaction([
        this.prisma.client.workflowRepository.deleteMany({
          where: {
            workflowId: id,
          },
        }),
        this.prisma.client.workflow.delete({
          where: {
            id,
            organizationId,
          },
        }),
      ])
    })
  }

  async updateStatus(id: string, status: WorkflowStatus): Promise<void> {
    return this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: {
          status,
          startedAt:
            status === WorkflowStatus.ACTIVE || status === WorkflowStatus.BRAINSTORMING ? new Date() : undefined,
          completedAt: status === WorkflowStatus.COMPLETED ? new Date() : undefined,
        },
      })
    })
  }

  async confirmClassification(id: string, type: WorkflowType, confirmedById: string): Promise<void> {
    return this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: {
          type,
          classificationConfirmedAt: new Date(),
          classificationConfirmedById: confirmedById,
        },
      })
    })
  }
}
