import { BaseTenantRepository, type Prisma, type PrismaClient, type WorkflowPhase } from '@vyrak/database'

import { WorkflowPhaseStatus } from '../../domain'

import type {
  WorkflowPhaseEntity,
  CreateWorkflowPhaseData,
  IWorkflowPhaseRepository,
  TransactionContext,
  UpdateWorkflowPhaseData,
} from '../../domain'

export class WorkflowPhasePrismaRepository extends BaseTenantRepository implements IWorkflowPhaseRepository {
  private mapToEntity(raw: WorkflowPhase): WorkflowPhaseEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      key: raw.key,
      name: raw.name,
      sequence: raw.sequence,
      status: raw.status as WorkflowPhaseStatus,
      config: raw.config as Record<string, unknown> | null,
      input: raw.input as Record<string, unknown> | null,
      output: raw.output as Record<string, unknown> | null,
      error: raw.error as Record<string, unknown> | null,
      startedAt: raw.startedAt,
      completedAt: raw.completedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async findById(id: string, tx?: TransactionContext): Promise<WorkflowPhaseEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const phase = await client.workflowPhase.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return phase ? this.mapToEntity(phase) : null
    })
  }

  async findByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<WorkflowPhaseEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const phases = await client.workflowPhase.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: {
          sequence: 'asc',
        },
      })

      return phases.map((phase) => this.mapToEntity(phase))
    })
  }

  async create(
    workflowId: string,
    data: CreateWorkflowPhaseData,
    tx?: TransactionContext
  ): Promise<WorkflowPhaseEntity> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const phase = await client.workflowPhase.create({
        data: {
          organizationId,
          workflowId,
          key: data.key,
          name: data.name,
          sequence: data.sequence,
          status: WorkflowPhaseStatus.PENDING,
          config: (data.config ?? null) as Prisma.InputJsonValue,
        },
      })

      return this.mapToEntity(phase)
    })
  }

  async update(id: string, data: UpdateWorkflowPhaseData, tx?: TransactionContext): Promise<WorkflowPhaseEntity> {
    return this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      const updateData: Prisma.WorkflowPhaseUpdateInput = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.sequence !== undefined) updateData.sequence = data.sequence
      if (data.config !== undefined) updateData.config = data.config as Prisma.InputJsonValue
      if (data.input !== undefined) updateData.input = data.input as Prisma.InputJsonValue
      if (data.output !== undefined) updateData.output = data.output as Prisma.InputJsonValue
      if (data.error !== undefined) updateData.error = data.error as Prisma.InputJsonValue
      if (data.startedAt !== undefined) updateData.startedAt = data.startedAt
      if (data.completedAt !== undefined) updateData.completedAt = data.completedAt

      const phase = await client.workflowPhase.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      })

      return this.mapToEntity(phase)
    })
  }

  async updateStatus(id: string, status: string, tx?: TransactionContext): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      await client.workflowPhase.update({
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

  async delete(id: string, tx?: TransactionContext): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      const client = (tx as PrismaClient) || this.prisma.client
      await client.workflowPhase.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
