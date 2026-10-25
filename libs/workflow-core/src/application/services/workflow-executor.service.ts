import { Inject, Logger } from '@nestjs/common'

import { LeaseManager } from './lease-manager.service'
import { RetryableError, RetryHandler } from './retry-handler.service'
import { IStepExecutor, StepExecutorResult } from './step-executor.interface'
import { getWorkflowDefinition, StepDefinition, WorkflowDefinition } from './workflow-definition'

import { StepStatus, WorkflowState } from '../../domain'
import { WorkflowRun } from '../../domain/entities'
import type { IEventRepository, IJobQueue, IStepRepository, IWorkflowRepository } from '../../domain/interfaces'
import { EVENT_REPOSITORY, JOB_QUEUE, STEP_REPOSITORY, WORKFLOW_REPOSITORY } from '../../infras/di'

/**
 * Workflow Executor Service
 * Orchestrates step execution for workflow runs
 */
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name)

  constructor(
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepo: IWorkflowRepository,
    @Inject(STEP_REPOSITORY) private readonly stepRepo: IStepRepository,
    @Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository,
    @Inject(JOB_QUEUE) private readonly jobQueue: IJobQueue,
    @Inject('STEP_EXECUTORS') private readonly stepExecutors: IStepExecutor[] = [],
    private readonly retryHandler: RetryHandler,
    private readonly leaseManager: LeaseManager
  ) {}

  /**
   * Main entry point for workflow execution
   * Orchestrates the entire workflow step execution flow
   */
  async executeRun(runId: string): Promise<void> {
    this.logger.log(`Executing workflow run: ${runId}`)

    // 1. Acquire lease
    const leaseAcquired = await this.leaseManager.acquireLease(runId)
    if (!leaseAcquired) {
      this.logger.warn(`Failed to acquire lease for run ${runId}, skipping execution (another worker owns it)`)
      return
    }

    try {
      // 2. Load run and validate state
      const run = await this.workflowRepo.findRunById(runId)
      if (!run) {
        throw new Error(`Workflow run not found: ${runId}`)
      }

      if (run.state !== WorkflowState.QUEUED && run.state !== WorkflowState.RUNNING) {
        throw new Error(`Invalid state for execution: ${run.state}`)
      }

      // 3. Transition to RUNNING if QUEUED
      if (run.state === WorkflowState.QUEUED) {
        await this.workflowRepo.updateRunState(runId, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })

        await this.eventRepo.appendEvent({
          runId,
          organizationId: run.organizationId,
          eventType: 'run_started',
          payload: {},
        })

        this.logger.log(`Workflow run ${runId} transitioned to RUNNING`)
      }

      // 4. Get workflow definition
      const workflowDef = getWorkflowDefinition(run.workflowKey)
      this.logger.debug(`Loaded workflow definition: ${workflowDef.key}`)

      // 5. Get current/next step
      const nextStep = await this.getNextStep(run, workflowDef)
      if (!nextStep) {
        // No more steps, workflow succeeded
        await this.completeWorkflow(run)
        return
      }

      this.logger.log(`Executing step: ${nextStep.key}`)

      // 6. Execute step
      try {
        const result = await this.executeStep(nextStep, run)
        await this.handleStepCompletion(run, nextStep, result)
      } catch (error) {
        this.logger.error(`Step execution failed: ${error}`)
        await this.handleStepFailure(run, nextStep, error)
      }
    } finally {
      // 7. Always release lease after execution
      await this.leaseManager.releaseLease(runId)
    }
  }

  /**
   * Get the next step to execute
   * Returns null if all steps are completed
   */
  private async getNextStep(run: WorkflowRun, workflowDef: WorkflowDefinition): Promise<StepDefinition | null> {
    const completedSteps = await this.stepRepo.findStepsByRunId(run.id)
    const completedKeys = new Set(completedSteps.filter((s) => s.status === StepStatus.SUCCEEDED).map((s) => s.stepKey))

    const nextStep = workflowDef.steps.find((step) => !completedKeys.has(step.key))
    return nextStep || null
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: StepDefinition, run: WorkflowRun): Promise<StepExecutorResult> {
    // Create step run record
    const stepRun = await this.stepRepo.createStepRun({
      runId: run.id,
      organizationId: run.organizationId,
      stepKey: step.key,
      stepType: step.type,
    })

    this.logger.debug(`Created step run: ${stepRun.id} for step: ${step.key}`)

    // Emit step_started event
    await this.eventRepo.appendEvent({
      runId: run.id,
      organizationId: run.organizationId,
      stepRunId: stepRun.id,
      eventType: 'step_started',
      payload: { stepKey: step.key, stepType: step.type },
    })

    // Update step to RUNNING
    await this.stepRepo.updateStepStatus(stepRun.id, StepStatus.RUNNING, {
      startedAt: new Date(),
    })

    // Find executor for this step type
    const executor = this.stepExecutors.find((e) => e.canHandle(step.type))
    if (!executor) {
      throw new Error(`No executor found for step type: ${step.type}`)
    }

    this.logger.debug(`Using executor for step type: ${step.type}`)

    // Execute step
    const result = await executor.execute(step, run)

    // Update step status with result
    await this.stepRepo.updateStepStatus(stepRun.id, result.status, {
      output: result.output,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      completedAt: new Date(),
    })

    this.logger.log(`Step ${step.key} completed with status: ${result.status}`)

    return result
  }

  /**
   * Handle step completion
   * Queue next step or handle failure
   */
  private async handleStepCompletion(
    run: WorkflowRun,
    step: StepDefinition,
    result: StepExecutorResult
  ): Promise<void> {
    // Emit step_completed event
    await this.eventRepo.appendEvent({
      runId: run.id,
      organizationId: run.organizationId,
      eventType: 'step_completed',
      payload: {
        stepKey: step.key,
        status: result.status,
        output: result.output,
      },
    })

    if (result.status === StepStatus.SUCCEEDED) {
      this.logger.log(`Step ${step.key} succeeded, queueing next step`)
      // Queue next step execution
      await this.jobQueue.enqueueWorkflowJob(run.id, run.organizationId)
    } else if (result.status === StepStatus.FAILED) {
      // Get step run ID for retry tracking
      const steps = await this.stepRepo.findStepsByRunId(run.id)
      const stepRun = steps.find((s) => s.stepKey === step.key)
      if (!stepRun) {
        this.logger.error(`Step run not found for step ${step.key}`)
        await this.failWorkflow(run, result.errorCode, result.errorMessage)
        return
      }

      // Check if retryable
      if (result.retryable && step.retryPolicy) {
        const error: RetryableError = {
          code: result.errorCode || 'UNKNOWN',
          message: result.errorMessage || 'Unknown error',
        }

        const scheduled = await this.retryHandler.scheduleRetry(
          stepRun.id,
          run.id,
          step.key,
          run.organizationId,
          error,
          step
        )

        if (!scheduled) {
          // Retry not scheduled, mark as permanently failed
          this.logger.warn(`Retry not eligible for step ${step.key}, marking as permanently failed`)
          await this.retryHandler.markPermanentlyFailed(stepRun.id, run.id, run.organizationId, error)
          await this.failWorkflow(run, error.code, error.message)
        }
        // If scheduled, do nothing - job will be reprocessed with delay
      } else {
        // Non-retryable failure, fail workflow
        this.logger.error(`Step ${step.key} failed, failing workflow`)
        await this.failWorkflow(run, result.errorCode, result.errorMessage)
      }
    }
  }

  /**
   * Handle unexpected step execution failure
   */
  private async handleStepFailure(run: WorkflowRun, step: StepDefinition, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error)
    this.logger.error(`Unexpected error executing step ${step.key}: ${message}`)
    await this.failWorkflow(run, 'EXECUTION_ERROR', message)
  }

  /**
   * Complete workflow successfully
   */
  private async completeWorkflow(run: WorkflowRun): Promise<void> {
    this.logger.log(`Completing workflow run: ${run.id}`)

    await this.workflowRepo.updateRunState(run.id, {
      status: WorkflowState.SUCCEEDED,
      completedAt: new Date(),
    })

    await this.eventRepo.appendEvent({
      runId: run.id,
      organizationId: run.organizationId,
      eventType: 'run_succeeded',
      payload: {},
    })

    this.logger.log(`Workflow run ${run.id} completed successfully`)
  }

  /**
   * Fail workflow with error details
   */
  private async failWorkflow(run: WorkflowRun, errorCode?: string, errorMessage?: string): Promise<void> {
    this.logger.error(`Failing workflow run ${run.id}: ${errorCode} - ${errorMessage}`)

    await this.workflowRepo.updateRunState(run.id, {
      status: WorkflowState.FAILED,
      errorCode,
      errorMessage,
      completedAt: new Date(),
    })

    await this.eventRepo.appendEvent({
      runId: run.id,
      organizationId: run.organizationId,
      eventType: 'run_failed',
      payload: { errorCode, errorMessage },
    })

    this.logger.log(`Workflow run ${run.id} failed`)
  }
}
