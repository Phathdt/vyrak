import { BaseTenantRepository, type Prisma, type WorkflowPhase } from '@vyrak/database'

import { WorkflowPhaseStatus } from '../../domain/entities'

import type { WorkflowPhaseEntity } from '../../domain/entities'
import type {
  CreateWorkflowPhaseData,
  IWorkflowPhaseRepository,
  UpdateWorkflowPhaseData,
} from '../../domain/interfaces/workflow-phase-repository.interface'

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

  async findById(id: string): Promise<WorkflowPhaseEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const phase = await this.prisma.client.workflowPhase.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return phase ? this.mapToEntity(phase) : null
    })
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const phases = await this.prisma.client.workflowPhase.findMany({
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

  async create(workflowId: string, data: CreateWorkflowPhaseData): Promise<WorkflowPhaseEntity> {
    return this.withTenantContext(async (organizationId) => {
      const phase = await this.prisma.client.workflowPhase.create({
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

  async update(id: string, data: UpdateWorkflowPhaseData): Promise<WorkflowPhaseEntity> {
    return this.withTenantContext(async (organizationId) => {
      const updateData: Prisma.WorkflowPhaseUpdateInput = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.sequence !== undefined) updateData.sequence = data.sequence
      if (data.config !== undefined) updateData.config = data.config as Prisma.InputJsonValue
      if (data.input !== undefined) updateData.input = data.input as Prisma.InputJsonValue
      if (data.output !== undefined) updateData.output = data.output as Prisma.InputJsonValue
      if (data.error !== undefined) updateData.error = data.error as Prisma.InputJsonValue
      if (data.startedAt !== undefined) updateData.startedAt = data.startedAt
      if (data.completedAt !== undefined) updateData.completedAt = data.completedAt

      const phase = await this.prisma.client.workflowPhase.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      })

      return this.mapToEntity(phase)
    })
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowPhase.update({
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
      await this.prisma.client.workflowPhase.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
