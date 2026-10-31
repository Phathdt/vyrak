import { BaseTenantRepository, type Prisma, type WorkflowEvent } from '@vyrak/database'

import { WorkflowEventActorType } from '../../domain'

import type { WorkflowEventEntity, CreateWorkflowEventData, IWorkflowEventRepository } from '../../domain'

export class WorkflowEventPrismaRepository extends BaseTenantRepository implements IWorkflowEventRepository {
  private mapToEntity(raw: WorkflowEvent): WorkflowEventEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      phaseId: raw.phaseId,
      eventType: raw.eventType,
      actorType: raw.actorType as WorkflowEventActorType | null,
      actorId: raw.actorId,
      payload: raw.payload as Record<string, unknown> | null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async findById(id: string): Promise<WorkflowEventEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const event = await this.prisma.client.workflowEvent.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return event ? this.mapToEntity(event) : null
    })
  }

  async findByWorkflowId(workflowId: string, limit = 100): Promise<WorkflowEventEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const events = await this.prisma.client.workflowEvent.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })

      return events.map((event) => this.mapToEntity(event))
    })
  }

  async findByPhaseId(phaseId: string, limit = 100): Promise<WorkflowEventEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const events = await this.prisma.client.workflowEvent.findMany({
        where: {
          phaseId,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })

      return events.map((event) => this.mapToEntity(event))
    })
  }

  async findByEventType(workflowId: string, eventType: string): Promise<WorkflowEventEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const events = await this.prisma.client.workflowEvent.findMany({
        where: {
          workflowId,
          eventType,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return events.map((event) => this.mapToEntity(event))
    })
  }

  async create(workflowId: string, data: CreateWorkflowEventData): Promise<WorkflowEventEntity> {
    return this.withTenantContext(async (organizationId) => {
      const event = await this.prisma.client.workflowEvent.create({
        data: {
          organizationId,
          workflowId,
          phaseId: data.phaseId ?? null,
          eventType: data.eventType,
          actorType: data.actorType ?? null,
          actorId: data.actorId ?? null,
          payload: (data.payload ?? null) as Prisma.InputJsonValue,
        },
      })

      return this.mapToEntity(event)
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowEvent.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
