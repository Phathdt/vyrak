import { BaseTenantRepository, type Prisma, type WorkflowWorkItem } from '@vyrak/database'

import { WorkflowWorkItemStatus } from '../../domain'

import type {
  WorkflowWorkItemEntity,
  CreateWorkflowWorkItemData,
  IWorkflowWorkItemRepository,
  UpdateWorkflowWorkItemData,
} from '../../domain'

export class WorkflowWorkItemPrismaRepository extends BaseTenantRepository implements IWorkflowWorkItemRepository {
  private mapToEntity(raw: WorkflowWorkItem): WorkflowWorkItemEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      key: raw.key,
      type: raw.type,
      title: raw.title,
      description: raw.description,
      parentId: raw.parentId,
      acceptanceCriteria: raw.acceptanceCriteria as Record<string, unknown> | null,
      status: raw.status as WorkflowWorkItemStatus,
      priority: raw.priority,
      estimate: raw.estimate as Record<string, unknown> | null,
      sequence: raw.sequence,
      metadata: raw.metadata as Record<string, unknown> | null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async findById(id: string): Promise<WorkflowWorkItemEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const item = await this.prisma.client.workflowWorkItem.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return item ? this.mapToEntity(item) : null
    })
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowWorkItemEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const items = await this.prisma.client.workflowWorkItem.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: {
          sequence: 'asc',
        },
      })

      return items.map((item) => this.mapToEntity(item))
    })
  }

  async findByParentId(parentId: string): Promise<WorkflowWorkItemEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const items = await this.prisma.client.workflowWorkItem.findMany({
        where: {
          parentId,
          organizationId,
        },
        orderBy: {
          sequence: 'asc',
        },
      })

      return items.map((item) => this.mapToEntity(item))
    })
  }

  async create(workflowId: string, data: CreateWorkflowWorkItemData): Promise<WorkflowWorkItemEntity> {
    return this.withTenantContext(async (organizationId) => {
      const item = await this.prisma.client.workflowWorkItem.create({
        data: {
          organizationId,
          workflowId,
          key: data.key,
          type: data.type,
          title: data.title,
          description: data.description ?? null,
          parentId: data.parentId ?? null,
          acceptanceCriteria: (data.acceptanceCriteria ?? null) as Prisma.InputJsonValue,
          status: WorkflowWorkItemStatus.PROPOSED,
          priority: data.priority ?? null,
          estimate: (data.estimate ?? null) as Prisma.InputJsonValue,
          sequence: data.sequence ?? 0,
          metadata: (data.metadata ?? null) as Prisma.InputJsonValue,
        },
      })

      return this.mapToEntity(item)
    })
  }

  async update(id: string, data: UpdateWorkflowWorkItemData): Promise<WorkflowWorkItemEntity> {
    return this.withTenantContext(async (organizationId) => {
      const updateData: Prisma.WorkflowWorkItemUpdateInput = {}

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.parentId !== undefined) updateData.parentId = data.parentId
      if (data.acceptanceCriteria !== undefined)
        updateData.acceptanceCriteria = data.acceptanceCriteria as Prisma.InputJsonValue
      if (data.status !== undefined) updateData.status = data.status
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.estimate !== undefined) updateData.estimate = data.estimate as Prisma.InputJsonValue
      if (data.sequence !== undefined) updateData.sequence = data.sequence
      if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue

      const item = await this.prisma.client.workflowWorkItem.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      })

      return this.mapToEntity(item)
    })
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowWorkItem.update({
        where: {
          id,
          organizationId,
        },
        data: {
          status,
        },
      })
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowWorkItem.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
