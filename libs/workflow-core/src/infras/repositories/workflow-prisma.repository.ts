import { randomUUID } from 'crypto'
import { Prisma, PrismaClient, WorkflowRun as PrismaWorkflowRun } from '@vyrak/database'

import {
  CreateRunParams,
  FindRunsParams,
  IWorkflowRepository,
  WorkflowAlreadyExistsError,
  WorkflowNotFoundError,
  WorkflowRepositoryError,
  WorkflowRun,
  WorkflowRunSchema,
  WorkflowState,
  WorkflowStateUpdate,
} from '../../domain'

/**
 * Prisma implementation of workflow repository
 * Maps between Prisma models and domain entities
 */
export class WorkflowPrismaRepository implements IWorkflowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createRun(params: CreateRunParams): Promise<WorkflowRun> {
    try {
      const run = await this.prisma.workflowRun.create({
        data: {
          organizationId: params.organizationId,
          projectId: params.projectId,
          workflowKey: params.workflowKey,
          workflowVersion: params.workflowVersion,
          initiatedByUserId: params.initiatedByUserId,
          idempotencyKey: params.idempotencyKey || randomUUID(),
          input: params.input ? (params.input as Prisma.InputJsonValue) : Prisma.JsonNull,
          status: WorkflowState.QUEUED,
        },
      })

      return this.mapToDomain(run)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new WorkflowAlreadyExistsError(
          `Workflow run with idempotency key already exists: ${params.idempotencyKey}`
        )
      }
      throw new WorkflowRepositoryError(
        'Failed to create workflow run',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findRunById(runId: string): Promise<WorkflowRun | null> {
    try {
      const run = await this.prisma.workflowRun.findUnique({
        where: { id: runId },
      })

      return run ? this.mapToDomain(run) : null
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow run',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async updateRunState(runId: string, state: WorkflowStateUpdate): Promise<void> {
    try {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: state.status,
          currentStepKey: state.currentStepKey,
          errorCode: state.errorCode,
          errorMessage: state.errorMessage,
          startedAt: state.startedAt,
          completedAt: state.completedAt,
          cancellationReason: state.cancellationReason,
          cancelledByUserId: state.cancelledByUserId,
          cancelledAt: state.cancelledAt,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new WorkflowNotFoundError(`Workflow run not found: ${runId}`)
      }
      throw new WorkflowRepositoryError(
        'Failed to update workflow run state',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findRunByIdempotencyKey(orgId: string, key: string): Promise<WorkflowRun | null> {
    try {
      const run = await this.prisma.workflowRun.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: orgId,
            idempotencyKey: key,
          },
        },
      })

      return run ? this.mapToDomain(run) : null
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow run by idempotency key',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findRunsWithCount(params: FindRunsParams): Promise<[WorkflowRun[], number]> {
    try {
      const where: Prisma.WorkflowRunWhereInput = {
        organizationId: params.organizationId,
        ...(params.projectId && { projectId: params.projectId }),
        ...(params.status && { status: params.status }),
      }

      const [runs, total] = await Promise.all([
        this.prisma.workflowRun.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: params.skip,
          take: params.limit,
        }),
        this.prisma.workflowRun.count({ where }),
      ])

      return [runs.map((run: PrismaWorkflowRun) => this.mapToDomain(run)), total]
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow runs with count',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async cancelRun(runId: string): Promise<void> {
    try {
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          cancelRequestedAt: new Date(),
          status: WorkflowState.CANCELLED,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new WorkflowNotFoundError(`Workflow run not found: ${runId}`)
      }
      throw new WorkflowRepositoryError(
        'Failed to cancel workflow run',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async acquireLease(runId: string, workerId: string, leaseDurationMs: number): Promise<boolean> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + leaseDurationMs)

    try {
      // Atomic update: only set lease if no active lease exists
      const result = await this.prisma.workflowRun.updateMany({
        where: {
          id: runId,
          OR: [{ leaseOwnerId: null }, { leaseExpiresAt: { lt: now } }],
        },
        data: {
          leaseOwnerId: workerId,
          leaseExpiresAt: expiresAt,
          lastHeartbeatAt: now,
        },
      })

      return result.count > 0
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to acquire lease',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async renewLease(runId: string, workerId: string, leaseDurationMs: number): Promise<boolean> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + leaseDurationMs)

    try {
      // Only renew if current owner
      const result = await this.prisma.workflowRun.updateMany({
        where: {
          id: runId,
          leaseOwnerId: workerId,
        },
        data: {
          leaseExpiresAt: expiresAt,
          lastHeartbeatAt: now,
        },
      })

      return result.count > 0
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to renew lease',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async releaseLease(runId: string, workerId: string): Promise<void> {
    try {
      await this.prisma.workflowRun.updateMany({
        where: {
          id: runId,
          leaseOwnerId: workerId,
        },
        data: {
          leaseOwnerId: null,
          leaseExpiresAt: null,
        },
      })
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to release lease',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async updateHeartbeat(runId: string, workerId: string): Promise<void> {
    try {
      await this.prisma.workflowRun.updateMany({
        where: {
          id: runId,
          leaseOwnerId: workerId,
        },
        data: {
          lastHeartbeatAt: new Date(),
        },
      })
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to update heartbeat',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findExpiredLeases(limit = 100): Promise<string[]> {
    try {
      const now = new Date()
      const runs = await this.prisma.workflowRun.findMany({
        where: {
          leaseOwnerId: { not: null },
          leaseExpiresAt: { lt: now },
          status: { in: [WorkflowState.QUEUED, WorkflowState.RUNNING] },
        },
        select: { id: true },
        take: limit,
      })

      return runs.map((run) => run.id)
    } catch (error) {
      throw new WorkflowRepositoryError(
        'Failed to find expired leases',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Map Prisma model to domain entity
   * Validates with Zod schema to ensure data integrity
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma internal type
  private mapToDomain(prismaRun: any): WorkflowRun {
    const validated = WorkflowRunSchema.parse({
      id: prismaRun.id,
      organizationId: prismaRun.organizationId,
      projectId: prismaRun.projectId,
      workflowKey: prismaRun.workflowKey,
      workflowVersion: prismaRun.workflowVersion,
      state: prismaRun.status as WorkflowState,
      initiatedByUserId: prismaRun.initiatedByUserId,
      idempotencyKey: prismaRun.idempotencyKey || crypto.randomUUID(),
      input: prismaRun.input ? (prismaRun.input as Record<string, unknown>) : undefined,
      currentStepKey: prismaRun.currentStepKey ?? undefined,
      errorCode: prismaRun.errorCode ?? undefined,
      errorMessage: prismaRun.errorMessage ?? undefined,
      startedAt: prismaRun.startedAt ?? undefined,
      completedAt: prismaRun.completedAt ?? undefined,
      cancelledAt: prismaRun.cancelledAt ?? undefined,
      cancelledByUserId: prismaRun.cancelledByUserId ?? undefined,
      cancellationReason: prismaRun.cancellationReason ?? undefined,
      createdAt: prismaRun.createdAt,
      updatedAt: prismaRun.updatedAt,
    })

    return validated
  }
}
