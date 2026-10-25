import { Prisma, PrismaClient } from '@vyrak/database'

import {
  CreateStepParams,
  IStepRepository,
  StepNotFoundError,
  StepRun,
  StepRunSchema,
  StepStatus,
  StepUpdateResult,
  WorkflowRepositoryError,
} from '../../domain'

export class StepPrismaRepository implements IStepRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createStepRun(params: CreateStepParams): Promise<StepRun> {
    try {
      const step = await this.prisma.workflowStepRun.create({
        data: {
          runId: params.runId,
          organizationId: params.organizationId,
          stepKey: params.stepKey,
          stepType: params.stepType || 'agent',
          input: (params.input || null) as Prisma.InputJsonValue,
          status: StepStatus.PENDING,
          attempt: 1,
        },
      })
      return this.mapToDomain(step)
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to create workflow step run',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findStepsByRunId(runId: string): Promise<StepRun[]> {
    try {
      const steps = await this.prisma.workflowStepRun.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma internal type
      return steps.map((step: any) => this.mapToDomain(step))
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow steps',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async updateStepStatus(stepRunId: string, status: StepStatus, result?: StepUpdateResult): Promise<void> {
    try {
      await this.prisma.workflowStepRun.update({
        where: { id: stepRunId },
        data: {
          status,
          output: result?.output as Prisma.InputJsonValue,
          errorCode: result?.errorCode,
          errorMessage: result?.errorMessage,
          startedAt: result?.startedAt,
          completedAt: result?.completedAt,
        },
      })
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new StepNotFoundError(`Step run not found: ${stepRunId}`)
      }
      throw new WorkflowRepositoryError(
        'Failed to update step run status',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async incrementAttempt(stepRunId: string): Promise<number> {
    try {
      const step = await this.prisma.workflowStepRun.update({
        where: { id: stepRunId },
        data: {
          attempt: { increment: 1 },
          status: StepStatus.PENDING,
        },
        select: { attempt: true },
      })
      return step.attempt
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new StepNotFoundError(`Step run not found: ${stepRunId}`)
      }
      throw new WorkflowRepositoryError(
        'Failed to increment step attempt',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findById(stepRunId: string): Promise<StepRun | null> {
    try {
      const step = await this.prisma.workflowStepRun.findUnique({
        where: { id: stepRunId },
      })
      return step ? this.mapToDomain(step) : null
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to find step run by ID',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma internal type
  private mapToDomain(prismaStep: any): StepRun {
    const validated = StepRunSchema.parse({
      id: prismaStep.id,
      runId: prismaStep.runId,
      organizationId: prismaStep.organizationId,
      stepKey: prismaStep.stepKey,
      stepType: prismaStep.stepType,
      status: prismaStep.status,
      attempt: prismaStep.attempt,
      input: prismaStep.input ?? undefined,
      output: prismaStep.output ?? undefined,
      errorCode: prismaStep.errorCode ?? undefined,
      errorMessage: prismaStep.errorMessage ?? undefined,
      startedAt: prismaStep.startedAt ?? undefined,
      completedAt: prismaStep.completedAt ?? undefined,
      createdAt: prismaStep.createdAt,
      updatedAt: prismaStep.updatedAt,
    })
    return validated
  }
}
