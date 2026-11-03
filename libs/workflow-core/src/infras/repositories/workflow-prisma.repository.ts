import { BaseTenantRepository, type Prisma, type PrismaClient, type Workflow } from '@vyrak/database'

import { WorkflowStatus } from '../../domain'

import type {
  CreateWorkflowData,
  IWorkflowRepository,
  TransactionContext,
  UpdateWorkflowData,
  WorkflowEntity,
  WorkflowFilters,
  WorkflowType,
} from '../../domain'

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

  async findById(id: string, tx?: TransactionContext): Promise<WorkflowEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const workflow = await client.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return workflow ? this.mapToEntity(workflow) : null
    })
  }

  async findAll(projectId: string, filters: WorkflowFilters, tx?: TransactionContext): Promise<WorkflowEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const where: Prisma.WorkflowWhereInput = {
        organizationId,
        projectId,
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      if (filters.type) {
        where.type = filters.type
      }

      if (filters.status) {
        where.status = filters.status
      }

      if (filters.createdById) {
        where.createdById = filters.createdById
      }

      const orderBy: Prisma.WorkflowOrderByWithRelationInput = filters.sort
        ? { [filters.sort]: filters.order || 'desc' }
        : { createdAt: 'desc' }

      const workflows = await client.workflow.findMany({
        where,
        orderBy,
        skip: filters.skip,
        take: filters.take,
      })

      return workflows.map((w) => this.mapToEntity(w))
    })
  }

  async count(projectId: string, filters: WorkflowFilters, tx?: TransactionContext): Promise<number> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const where: Prisma.WorkflowWhereInput = {
        organizationId,
        projectId,
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ]
      }

      if (filters.type) {
        where.type = filters.type
      }

      if (filters.status) {
        where.status = filters.status
      }

      if (filters.createdById) {
        where.createdById = filters.createdById
      }

      return client.workflow.count({ where })
    })
  }

  async create(
    projectId: string,
    createdById: string,
    data: CreateWorkflowData,
    tx?: TransactionContext
  ): Promise<WorkflowEntity> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const workflow = await client.workflow.create({
        data: {
          organizationId,
          projectId,
          createdById,
          title: data.title,
          description: data.description ?? null,
          status: WorkflowStatus.DRAFT,
        },
      })

      return this.mapToEntity(workflow)
    })
  }

  async update(id: string, data: UpdateWorkflowData, tx?: TransactionContext): Promise<WorkflowEntity> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const workflow = await client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: {
          title: data.title,
          description: data.description,
        },
      })

      return this.mapToEntity(workflow)
    })
  }

  async updateStatus(id: string, status: WorkflowStatus, tx?: TransactionContext): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const updateData: Prisma.WorkflowUpdateInput = {
        status,
      }

      if (status === WorkflowStatus.ACTIVE) {
        updateData.startedAt = new Date()
      }

      if (status === WorkflowStatus.COMPLETED) {
        updateData.completedAt = new Date()
      }

      await client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      })
    })
  }

  async updateWorkflowType(id: string, type: WorkflowType, tx?: TransactionContext): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      await client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: { type },
      })
    })
  }

  async updateDefinitionContext(
    id: string,
    data: { currentPhaseKey: string | null; definitionSnapshot: Record<string, unknown> },
    tx?: TransactionContext
  ): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      await client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: {
          currentPhaseKey: data.currentPhaseKey,
          definitionSnapshot: data.definitionSnapshot as Prisma.InputJsonValue,
        },
      })
    })
  }

  async delete(id: string, tx?: TransactionContext): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      await client.workflow.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
