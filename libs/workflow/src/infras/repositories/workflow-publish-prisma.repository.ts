import { BaseTenantRepository, type WorkflowPublish } from '@vyrak/database'

import { WorkflowPublishStatus } from '../../domain'

import type { WorkflowPublishEntity, CreateWorkflowPublishData, IWorkflowPublishRepository } from '../../domain'

export class WorkflowPublishPrismaRepository extends BaseTenantRepository implements IWorkflowPublishRepository {
  private mapToEntity(raw: WorkflowPublish): WorkflowPublishEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      connectionId: raw.connectionId,
      approvalId: raw.approvalId,
      status: raw.status as WorkflowPublishStatus,
      idempotencyKey: raw.idempotencyKey,
      attempts: raw.attempts,
      lastError: raw.lastError,
      startedAt: raw.startedAt,
      completedAt: raw.completedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async findById(id: string): Promise<WorkflowPublishEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const publish = await this.prisma.client.workflowPublish.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return publish ? this.mapToEntity(publish) : null
    })
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowPublishEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const publishes = await this.prisma.client.workflowPublish.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: {
          startedAt: 'desc',
        },
      })

      return publishes.map((publish) => this.mapToEntity(publish))
    })
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<WorkflowPublishEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const publish = await this.prisma.client.workflowPublish.findFirst({
        where: {
          idempotencyKey,
          organizationId,
        },
      })

      return publish ? this.mapToEntity(publish) : null
    })
  }

  async create(workflowId: string, data: CreateWorkflowPublishData): Promise<WorkflowPublishEntity> {
    return this.withTenantContext(async (organizationId) => {
      const publish = await this.prisma.client.workflowPublish.create({
        data: {
          organizationId,
          workflowId,
          connectionId: data.connectionId,
          approvalId: data.approvalId,
          idempotencyKey: data.idempotencyKey,
          status: WorkflowPublishStatus.PENDING,
          attempts: 0,
        },
      })

      return this.mapToEntity(publish)
    })
  }

  async updateStatus(id: string, status: string, error: string | null = null): Promise<WorkflowPublishEntity> {
    return this.withTenantContext(async (organizationId) => {
      const publish = await this.prisma.client.workflowPublish.update({
        where: {
          id,
          organizationId,
        },
        data: {
          status,
          lastError: error,
          completedAt:
            status === WorkflowPublishStatus.SUCCEEDED || status === WorkflowPublishStatus.FAILED ? new Date() : null,
        },
      })

      return this.mapToEntity(publish)
    })
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowPublish.update({
        where: {
          id,
          organizationId,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      })
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowPublish.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
