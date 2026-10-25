import { z } from 'zod'

import { InvalidStepStateError } from '../errors/invalid-step-state.error'
import { StepStatus } from '../step-types'

// Re-export StepStatus for convenience
export { StepStatus }

/**
 * Schema for StepRunEntity validation
 */
export const StepRunSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepKey: z.string().min(1),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.nativeEnum(StepStatus),
  attempt: z.number().int().min(1),
  maxAttempts: z.number().int().min(1),
  inputRef: z.string().optional(),
  outputRef: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  retryable: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
})

export type StepRunData = z.infer<typeof StepRunSchema>

/**
 * Domain entity for a step run
 * Manages step lifecycle and retry logic
 */
export class StepRunEntity {
  constructor(
    public readonly id: string,
    public readonly runId: string,
    public readonly stepKey: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public status: StepStatus,
    public attempt: number,
    public readonly maxAttempts: number,
    public inputRef?: string,
    public outputRef?: string,
    public errorCode?: string,
    public errorMessage?: string,
    public retryable: boolean = false,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public startedAt?: Date,
    public completedAt?: Date
  ) {
    this.validate()
  }

  /**
   * Validate entity invariants
   */
  private validate(): void {
    const parsed = StepRunSchema.safeParse({
      id: this.id,
      runId: this.runId,
      stepKey: this.stepKey,
      organizationId: this.organizationId,
      projectId: this.projectId,
      status: this.status,
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      inputRef: this.inputRef,
      outputRef: this.outputRef,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      retryable: this.retryable,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    })

    if (!parsed.success) {
      throw new InvalidStepStateError(`Invalid step run: ${parsed.error.message}`)
    }
  }

  /**
   * Check if step is currently running
   */
  isRunning(): boolean {
    return this.status === StepStatus.RUNNING
  }

  /**
   * Check if step is in terminal state
   */
  isTerminal(): boolean {
    return [StepStatus.SUCCEEDED, StepStatus.FAILED, StepStatus.SKIPPED].includes(this.status)
  }

  /**
   * Check if step can be retried
   */
  canRetry(): boolean {
    return this.retryable && this.attempt < this.maxAttempts
  }

  /**
   * Increment attempt counter
   */
  incrementAttempt(): void {
    if (this.attempt >= this.maxAttempts) {
      throw new InvalidStepStateError(`Cannot increment attempt: already at max attempts (${this.maxAttempts})`)
    }
    this.attempt++
    this.updatedAt = new Date()
  }

  /**
   * Start step execution
   */
  start(): void {
    if (this.status !== StepStatus.PENDING) {
      throw new InvalidStepStateError(`Cannot start step: current status is ${this.status}`)
    }
    this.status = StepStatus.RUNNING
    this.startedAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Mark step as succeeded
   */
  succeed(outputRef?: string): void {
    if (!this.isRunning()) {
      throw new InvalidStepStateError(`Cannot succeed step: current status is ${this.status}`)
    }
    this.status = StepStatus.SUCCEEDED
    this.outputRef = outputRef
    this.completedAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Mark step as failed
   */
  fail(errorCode: string, errorMessage: string, retryable: boolean): void {
    if (!this.isRunning()) {
      throw new InvalidStepStateError(`Cannot fail step: current status is ${this.status}`)
    }
    this.status = StepStatus.FAILED
    this.errorCode = errorCode
    this.errorMessage = errorMessage
    this.retryable = retryable
    this.completedAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Mark step as skipped
   */
  skip(): void {
    if (this.status !== StepStatus.PENDING) {
      throw new InvalidStepStateError(`Cannot skip step: current status is ${this.status}`)
    }
    this.status = StepStatus.SKIPPED
    this.completedAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Get data as plain object for serialization
   */
  toData(): StepRunData {
    return {
      id: this.id,
      runId: this.runId,
      stepKey: this.stepKey,
      organizationId: this.organizationId,
      projectId: this.projectId,
      status: this.status,
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      inputRef: this.inputRef,
      outputRef: this.outputRef,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      retryable: this.retryable,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    }
  }

  /**
   * Create entity from data
   */
  static fromData(data: StepRunData): StepRunEntity {
    return new StepRunEntity(
      data.id,
      data.runId,
      data.stepKey,
      data.organizationId,
      data.projectId,
      data.status,
      data.attempt,
      data.maxAttempts,
      data.inputRef,
      data.outputRef,
      data.errorCode,
      data.errorMessage,
      data.retryable,
      data.createdAt,
      data.updatedAt,
      data.startedAt,
      data.completedAt
    )
  }
}
