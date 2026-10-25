import { randomUUID } from 'crypto'
import { DatabaseService, Prisma } from '@vyrak/database'

import {
  CreateRunParams,
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
  constructor(private readonly db: DatabaseService) {}

  async createRun(params: CreateRunParams): Promise<WorkflowRun> {
    try {
      const run = await this.db.client.workflowRun.create({
        data: {
          organizationId: params.organizationId,
          projectId: params.projectId,
          workflowKey: params.workflowKey,
          workflowVersion: params.workflowVersion,
          initiatedByUserId: params.initiatedByUserId,
          idempotencyKey: params.idempotencyKey || randomUUID(),
          input: params.input ? (params.input as Prisma.InputJsonValue) : null,
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
      const run = await this.db.client.workflowRun.findUnique({
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
      await this.db.client.workflowRun.update({
        where: { id: runId },
        data: {
          status: state.status,
          currentStepKey: state.currentStepKey,
          errorCode: state.errorCode,
          errorMessage: state.errorMessage,
          startedAt: state.startedAt,
          completedAt: state.completedAt,
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
      const run = await this.db.client.workflowRun.findUnique({
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

  async cancelRun(runId: string): Promise<void> {
    try {
      await this.db.client.workflowRun.update({
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
      currentStepKey: prismaRun.currentStepKey ?? undefined,
      errorCode: prismaRun.errorCode ?? undefined,
      errorMessage: prismaRun.errorMessage ?? undefined,
      createdAt: prismaRun.createdAt,
      updatedAt: prismaRun.updatedAt,
      startedAt: prismaRun.startedAt ?? undefined,
      completedAt: prismaRun.completedAt ?? undefined,
    })

    return validated
  }
}
