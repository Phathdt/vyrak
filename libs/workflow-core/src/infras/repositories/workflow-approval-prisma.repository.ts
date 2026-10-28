import {
  ApprovalStatus,
  WorkflowApprovalSchema,
  type WorkflowApproval,
} from '../../domain/entities/workflow-approval.entity'

import type { IWorkflowApprovalRepository } from '../../domain/interfaces/workflow-approval.repository.interface'
import type { DatabaseService } from '@vyrak/database'

/**
 * Prisma implementation of workflow approval repository
 * Maps between Prisma models and domain entities
 *
 * NO @Injectable() decorator - plain TypeScript class registered via factory
 */
export class WorkflowApprovalPrismaRepository implements IWorkflowApprovalRepository {
  constructor(private readonly db: DatabaseService) {}

  async save(approval: WorkflowApproval): Promise<void> {
    // Fetch organizationId from workflow run for tenant isolation
    const run = await this.db.client.workflowRun.findUniqueOrThrow({
      where: { id: approval.workflowRunId },
      select: { organizationId: true },
    })

    await this.db.client.workflowApproval.upsert({
      where: { id: approval.id },
      update: {
        status: approval.status,
        decidedByUserId: approval.decidedByUserId ?? null,
        decidedAt: approval.decidedAt ?? null,
        comment: approval.comment ?? null,
        invalidatedAt: approval.invalidatedAt ?? null,
        invalidationReason: approval.invalidationReason ?? null,
        updatedAt: approval.updatedAt,
      },
      create: {
        id: approval.id,
        organizationId: run.organizationId,
        workflowRunId: approval.workflowRunId,
        status: approval.status,
        planArtifactId: approval.planArtifactId,
        planArtifactHash: approval.planArtifactHash,
        decidedByUserId: approval.decidedByUserId ?? null,
        decidedAt: approval.decidedAt ?? null,
        comment: approval.comment ?? null,
        invalidatedAt: approval.invalidatedAt ?? null,
        invalidationReason: approval.invalidationReason ?? null,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      },
    })
  }

  async findById(id: string): Promise<WorkflowApproval | null> {
    const record = await this.db.client.workflowApproval.findUnique({
      where: { id },
    })

    return record ? this.toDomain(record) : null
  }

  async findByRunId(runId: string): Promise<WorkflowApproval | null> {
    const record = await this.db.client.workflowApproval.findUnique({
      where: { workflowRunId: runId },
    })

    return record ? this.toDomain(record) : null
  }

  async findPendingByRunId(runId: string): Promise<WorkflowApproval | null> {
    const record = await this.db.client.workflowApproval.findFirst({
      where: {
        workflowRunId: runId,
        status: ApprovalStatus.PENDING,
        invalidatedAt: null,
      },
    })

    return record ? this.toDomain(record) : null
  }

  /**
   * Map Prisma record to domain entity
   */
  private toDomain(record: {
    id: string
    workflowRunId: string
    status: string
    planArtifactId: string
    planArtifactHash: string
    decidedByUserId: string | null
    decidedAt: Date | null
    comment: string | null
    invalidatedAt: Date | null
    invalidationReason: string | null
    createdAt: Date
    updatedAt: Date
  }): WorkflowApproval {
    const approval: WorkflowApproval = {
      id: record.id,
      workflowRunId: record.workflowRunId,
      status: record.status as ApprovalStatus,
      planArtifactId: record.planArtifactId,
      planArtifactHash: record.planArtifactHash,
      decidedByUserId: record.decidedByUserId ?? undefined,
      decidedAt: record.decidedAt ?? undefined,
      comment: record.comment ?? undefined,
      invalidatedAt: record.invalidatedAt ?? undefined,
      invalidationReason: record.invalidationReason ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }

    const parsed = WorkflowApprovalSchema.safeParse(approval)
    if (!parsed.success) {
      throw new Error(`Invalid approval record from database: ${parsed.error.message}`)
    }

    return approval
  }
}
