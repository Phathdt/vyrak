import { BaseTenantRepository, type Prisma, type Workflow } from '@vyrak/database'

import { WorkflowStatus } from '../../domain'

import type {
  CreateWorkflowData,
  IWorkflowRepository,
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

  async findById(id: string): Promise<WorkflowEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const workflow = await this.prisma.client.workflow.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return workflow ? this.mapToEntity(workflow) : null
    })
  }

  async findAll(projectId: string, filters: WorkflowFilters): Promise<WorkflowEntity[]> {
    return this.withTenantContext(async (organizationId) => {
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

      const workflows = await this.prisma.client.workflow.findMany({
        where,
        orderBy,
        skip: filters.skip,
        take: filters.take,
      })

      return workflows.map((w) => this.mapToEntity(w))
    })
  }

  async count(projectId: string, filters: WorkflowFilters): Promise<number> {
    return this.withTenantContext(async (organizationId) => {
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

      return this.prisma.client.workflow.count({ where })
    })
  }

  async create(projectId: string, createdById: string, data: CreateWorkflowData): Promise<WorkflowEntity> {
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

      return this.mapToEntity(workflow)
    })
  }

  async update(id: string, data: UpdateWorkflowData): Promise<WorkflowEntity> {
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

      return this.mapToEntity(workflow)
    })
  }

  async updateStatus(id: string, status: WorkflowStatus): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const updateData: Prisma.WorkflowUpdateInput = {
        status,
      }

      if (status === WorkflowStatus.ACTIVE || status === WorkflowStatus.BRAINSTORMING) {
        updateData.startedAt = new Date()
      }

      if (status === WorkflowStatus.COMPLETED) {
        updateData.completedAt = new Date()
      }

      await this.prisma.client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      })
    })
  }

  async updateType(id: string, type: WorkflowType, confirmedById: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflow.update({
        where: {
          id,
          organizationId,
        },
        data: {
          type,
          classificationConfirmedById: confirmedById,
          classificationConfirmedAt: new Date(),
        },
      })
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflow.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
