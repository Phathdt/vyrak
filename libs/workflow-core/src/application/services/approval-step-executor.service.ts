import { createHash } from 'crypto'

import type { IStepExecutor, StepExecutorResult } from './step-executor.interface'
import type { StepDefinition } from './workflow-definition'

import type { WorkflowApproval } from '../../domain/entities/workflow-approval.entity'
import { createWorkflowApproval } from '../../domain/entities/workflow-approval.entity'
import type { WorkflowRun } from '../../domain/entities/workflow-run.entity'
import {
  ArtifactNotFoundError,
  InvalidStepTypeError,
  MissingPlanArtifactError,
} from '../../domain/errors/workflow-approval.errors'
import type { CreateEventParams, IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IWorkflowApprovalRepository } from '../../domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'
import type { IArtifact, IArtifactRepository } from '../../domain/interfaces/artifact.interface'
import { StepStatus, StepType } from '../../domain/step-types'
import { WorkflowState } from '../../domain/workflow-state'

/**
 * Simple logger interface for application services
 */
export interface ILogger {
  info(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
  debug(message: string, context?: Record<string, unknown>): void
}

/**
 * Approval step executor service
 *
 * Pauses workflow execution at approval gates and creates approval records.
 * NO @Injectable() decorator - plain TypeScript class with constructor injection.
 */
export class ApprovalStepExecutor implements IStepExecutor {
  constructor(
    private readonly workflowApprovalRepository: IWorkflowApprovalRepository,
    private readonly workflowRunRepository: IWorkflowRepository,
    private readonly artifactRepository: IArtifactRepository,
    private readonly eventRepository: IEventRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * Check if this executor can handle the step type
   */
  canHandle(stepType: StepType): boolean {
    return stepType === StepType.APPROVAL
  }

  /**
   * Execute approval step
   *
   * Creates pending approval record, emits event, and transitions workflow to waiting_approval state.
   * Does NOT queue next step - workflow pauses until approval decision.
   */
  async execute(step: StepDefinition, run: WorkflowRun): Promise<StepExecutorResult> {
    try {
      // 1. Validate step type
      if (step.type !== StepType.APPROVAL) {
        throw new InvalidStepTypeError(step.type, StepType.APPROVAL)
      }

      // 2. Extract plan artifact ID from run context
      const planArtifactId = this.extractPlanArtifactId(run)
      if (!planArtifactId) {
        throw new MissingPlanArtifactError(step.key)
      }

      // 3. Verify artifact exists
      const planArtifact = await this.artifactRepository.findById(planArtifactId)
      if (!planArtifact) {
        throw new ArtifactNotFoundError(planArtifactId)
      }

      // 4. Create workflow approval record
      const approval = createWorkflowApproval({
        workflowRunId: run.id,
        planArtifactId: planArtifactId,
        planArtifactHash: this.hashArtifact(planArtifact),
      })

      await this.workflowApprovalRepository.save(approval)

      // 5. Emit approval_requested event
      await this.emitApprovalRequestedEvent(approval, run)

      // 6. Transition workflow run to waiting_approval state
      await this.workflowRunRepository.updateRunState(run.id, {
        status: WorkflowState.WAITING_APPROVAL,
        currentStepKey: step.key,
      })

      this.logger.info('Approval step executed successfully', {
        runId: run.id,
        approvalId: approval.id,
        stepKey: step.key,
        planArtifactId,
      })

      // 7. Return step result with approval_required status
      return {
        status: StepStatus.SUCCEEDED,
        output: {
          approvalId: approval.id,
          planArtifactId: planArtifactId,
          status: 'approval_required',
        },
        retryable: false,
      }
    } catch (error) {
      this.logger.error('Approval step execution failed', {
        runId: run.id,
        stepKey: step.key,
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        status: StepStatus.FAILED,
        errorCode: this.getErrorCode(error),
        errorMessage: error instanceof Error ? error.message : String(error),
        retryable: false,
      }
    }
  }

  /**
   * Extract plan artifact ID from workflow run context
   * Looks in the run's input or previous step output
   */
  private extractPlanArtifactId(run: WorkflowRun): string | null {
    // Try to get from run input (set by previous step)
    const input = run.input as Record<string, unknown> | undefined
    if (input?.planArtifactId) {
      return input.planArtifactId as string
    }

    // TODO: Fetch from previous step's output when step execution history is available
    return null
  }

  /**
   * Hash artifact content for version validation
   * Uses SHA-256 to create a stable hash of the plan content
   */
  private hashArtifact(artifact: IArtifact): string {
    const content = typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content)
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Emit approval_requested event
   */
  private async emitApprovalRequestedEvent(approval: WorkflowApproval, run: WorkflowRun): Promise<void> {
    const eventParams: CreateEventParams = {
      runId: run.id,
      organizationId: run.organizationId,
      eventType: 'approval_requested',
      payload: {
        approvalId: approval.id,
        planArtifactId: approval.planArtifactId,
        planArtifactHash: approval.planArtifactHash,
        requestedAt: approval.createdAt.toISOString(),
      },
    }

    await this.eventRepository.appendEvent(eventParams)
  }

  /**
   * Get error code from error type
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof InvalidStepTypeError) {
      return 'INVALID_STEP_TYPE'
    }
    if (error instanceof MissingPlanArtifactError) {
      return 'MISSING_PLAN_ARTIFACT'
    }
    if (error instanceof ArtifactNotFoundError) {
      return 'ARTIFACT_NOT_FOUND'
    }
    return 'APPROVAL_EXECUTION_ERROR'
  }
}
