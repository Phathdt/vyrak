import { BaseTenantRepository, type Prisma, type WorkflowMessage } from '@vyrak/database'

import { WorkflowMessageRole } from '../../domain/entities'

import type { WorkflowMessageEntity } from '../../domain/entities'
import type {
  CreateWorkflowMessageData,
  IWorkflowMessageRepository,
} from '../../domain/interfaces/workflow-message-repository.interface'

export class WorkflowMessagePrismaRepository extends BaseTenantRepository implements IWorkflowMessageRepository {
  private mapToEntity(raw: WorkflowMessage): WorkflowMessageEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      phaseId: raw.phaseId,
      agentExecutionId: raw.agentExecutionId,
      role: raw.role as WorkflowMessageRole,
      content: raw.content,
      metadata: raw.metadata as Record<string, unknown> | null,
      createdById: raw.createdById,
      createdAt: raw.createdAt,
    }
  }

  async findById(id: string): Promise<WorkflowMessageEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const message = await this.prisma.client.workflowMessage.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return message ? this.mapToEntity(message) : null
    })
  }

  async findByWorkflowId(workflowId: string, limit = 100): Promise<WorkflowMessageEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const messages = await this.prisma.client.workflowMessage.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })

      return messages.map((msg) => this.mapToEntity(msg))
    })
  }

  async findByPhaseId(phaseId: string, limit = 100): Promise<WorkflowMessageEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const messages = await this.prisma.client.workflowMessage.findMany({
        where: {
          phaseId,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      })

      return messages.map((msg) => this.mapToEntity(msg))
    })
  }

  async create(workflowId: string, data: CreateWorkflowMessageData): Promise<WorkflowMessageEntity> {
    return this.withTenantContext(async (organizationId) => {
      const message = await this.prisma.client.workflowMessage.create({
        data: {
          organizationId,
          workflowId,
          phaseId: data.phaseId ?? null,
          agentExecutionId: data.agentExecutionId ?? null,
          role: data.role,
          content: data.content,
          metadata: (data.metadata ?? null) as Prisma.InputJsonValue,
          createdById: data.createdById ?? null,
        },
      })

      return this.mapToEntity(message)
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowMessage.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
