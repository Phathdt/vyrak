import { BaseTenantRepository, type WorkflowApproval } from '@vyrak/database'

import { WorkflowApprovalStatus } from '../../domain/entities'

import type { WorkflowApprovalEntity } from '../../domain/entities'
import type { IWorkflowApprovalRepository } from '../../domain/interfaces/workflow-approval-repository.interface'

export class WorkflowApprovalPrismaRepository extends BaseTenantRepository implements IWorkflowApprovalRepository {
  private mapToEntity(raw: WorkflowApproval): WorkflowApprovalEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      proposalArtifactId: raw.proposalArtifactId,
      status: raw.status as WorkflowApprovalStatus,
      requestedById: raw.requestedById,
      decidedById: raw.decidedById,
      decisionNote: raw.decisionNote,
      requestedAt: raw.requestedAt,
      decidedAt: raw.decidedAt,
    }
  }

  async findById(id: string): Promise<WorkflowApprovalEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const approval = await this.prisma.client.workflowApproval.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return approval ? this.mapToEntity(approval) : null
    })
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowApprovalEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const approvals = await this.prisma.client.workflowApproval.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: {
          requestedAt: 'desc',
        },
      })

      return approvals.map((approval) => this.mapToEntity(approval))
    })
  }

  async findPendingByWorkflowId(workflowId: string): Promise<WorkflowApprovalEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const approvals = await this.prisma.client.workflowApproval.findMany({
        where: {
          workflowId,
          organizationId,
          status: WorkflowApprovalStatus.PENDING,
        },
        orderBy: {
          requestedAt: 'desc',
        },
      })

      return approvals.map((approval) => this.mapToEntity(approval))
    })
  }

  async create(workflowId: string, proposalArtifactId: string, requestedById: string): Promise<WorkflowApprovalEntity> {
    return this.withTenantContext(async (organizationId) => {
      const approval = await this.prisma.client.workflowApproval.create({
        data: {
          organizationId,
          workflowId,
          proposalArtifactId,
          requestedById,
          status: WorkflowApprovalStatus.PENDING,
        },
      })

      return this.mapToEntity(approval)
    })
  }

  async updateStatus(
    id: string,
    status: string,
    decidedById: string,
    decisionNote: string | null = null
  ): Promise<WorkflowApprovalEntity> {
    return this.withTenantContext(async (organizationId) => {
      const approval = await this.prisma.client.workflowApproval.update({
        where: {
          id,
          organizationId,
        },
        data: {
          status,
          decidedById,
          decidedAt: new Date(),
          decisionNote,
        },
      })

      return this.mapToEntity(approval)
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowApproval.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
