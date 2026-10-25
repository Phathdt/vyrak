import { Inject, Logger } from '@nestjs/common'

import type { StepDefinition } from './workflow-definition'

import type { IEventRepository, IJobQueue, IStepRepository } from '../../domain/interfaces'
import type { RetryPolicy } from '../../domain/step-contracts'
import { EVENT_REPOSITORY, JOB_QUEUE, STEP_REPOSITORY } from '../../infras/di'

/**
 * Step execution error with classification code for retry logic
 */
export interface RetryableError {
  code: string
  message: string
}

/**
 * Retry Handler Service
 * Manages automatic retry logic for transient step failures
 */
export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name)

  constructor(
    @Inject(STEP_REPOSITORY) private readonly stepRepo: IStepRepository,
    @Inject(EVENT_REPOSITORY) private readonly eventRepo: IEventRepository,
    @Inject(JOB_QUEUE) private readonly jobQueue: IJobQueue
  ) {}

  /**
   * Check if error is retryable based on policy
   * Returns true if the error can be retried, false otherwise
   */
  shouldRetry(error: RetryableError, attempt: number, policy: RetryPolicy): boolean {
    // Check max attempts
    if (attempt >= policy.maxAttempts) {
      this.logger.debug(`Max attempts (${policy.maxAttempts}) reached for attempt ${attempt}`)
      return false
    }

    // Check if error code is retryable
    if (policy.retryableErrorCodes && policy.retryableErrorCodes.length > 0) {
      const isRetryable = policy.retryableErrorCodes.includes(error.code)
      this.logger.debug(`Error code ${error.code} retryable: ${isRetryable}`)
      return isRetryable
    }

    // Default: retry on known transient errors
    const transientErrors = ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'RATE_LIMIT']
    const isTransient = transientErrors.includes(error.code)
    this.logger.debug(`Error code ${error.code} is transient: ${isTransient}`)
    return isTransient
  }

  /**
   * Calculate backoff delay with exponential backoff and jitter
   * Returns delay in milliseconds
   */
  calculateBackoff(attempt: number, policy: RetryPolicy): number {
    const baseDelay = policy.backoffMs || 1000
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)

    // Add jitter (0-20% random variation)
    const jitter = exponentialDelay * 0.2 * Math.random()

    const totalDelay = Math.floor(exponentialDelay + jitter)
    this.logger.debug(`Calculated backoff for attempt ${attempt}: ${totalDelay}ms (base: ${baseDelay}ms)`)
    return totalDelay
  }

  /**
   * Schedule retry for a failed step
   * Returns true if retry was scheduled, false if retry not eligible
   */
  async scheduleRetry(
    stepRunId: string,
    runId: string,
    stepKey: string,
    organizationId: string,
    error: RetryableError,
    step: StepDefinition
  ): Promise<boolean> {
    // Get current step run to check attempt
    const stepRun = await this.stepRepo.findById(stepRunId)
    if (!stepRun) {
      throw new Error(`Step run not found: ${stepRunId}`)
    }

    const policy = step.retryPolicy
    if (!policy) {
      this.logger.debug(`No retry policy for step ${stepKey}`)
      return false // No retry policy
    }

    // Check if should retry
    if (!this.shouldRetry(error, stepRun.attempt, policy)) {
      this.logger.log(`Retry not eligible for step ${stepKey} (attempt ${stepRun.attempt})`)
      return false
    }

    // Increment attempt counter
    const newAttempt = await this.stepRepo.incrementAttempt(stepRunId)
    this.logger.log(`Scheduling retry for step ${stepKey}, attempt ${newAttempt}`)

    // Calculate backoff delay
    const delayMs = this.calculateBackoff(newAttempt, policy)

    // Emit retry_scheduled event
    await this.eventRepo.appendEvent({
      runId,
      organizationId,
      stepRunId,
      eventType: 'retry_scheduled',
      payload: {
        stepKey,
        attempt: newAttempt,
        delayMs,
        errorCode: error.code,
        errorMessage: error.message,
      },
    })

    // Re-enqueue step job with delay
    await this.jobQueue.enqueueStepJob(runId, stepKey, organizationId, { delay: delayMs })

    this.logger.log(`Retry scheduled for step ${stepKey}, attempt ${newAttempt} with delay ${delayMs}ms`)
    return true
  }

  /**
   * Mark step as permanently failed after exhausting retries
   */
  async markPermanentlyFailed(
    stepRunId: string,
    runId: string,
    organizationId: string,
    error: RetryableError
  ): Promise<void> {
    this.logger.warn(`Marking step ${stepRunId} as permanently failed: ${error.code}`)

    await this.eventRepo.appendEvent({
      runId,
      organizationId,
      stepRunId,
      eventType: 'step_failed_permanently',
      payload: {
        errorCode: error.code,
        errorMessage: error.message,
        reason: 'Max retry attempts exceeded',
      },
    })
  }
}
