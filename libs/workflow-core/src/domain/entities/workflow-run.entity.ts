import { z } from 'zod'

import { InvalidWorkflowStateError } from '../errors/invalid-workflow-state.error'
import { WorkflowState, WorkflowStateMachine } from '../workflow-state'

/**
 * Schema for WorkflowRunEntity validation
 */
export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflowKey: z.string().min(1),
  workflowVersion: z.string().regex(/^\d+\.\d+\.\d+$/), // semver pattern
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  state: z.nativeEnum(WorkflowState),
  currentStepKey: z.string().optional(),
  initiatedByUserId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
})

export type WorkflowRunData = z.infer<typeof WorkflowRunSchema>

/**
 * Domain entity for a workflow run
 * Enforces business invariants and provides state management
 */
export class WorkflowRunEntity {
  private stateMachine: WorkflowStateMachine

  constructor(
    public readonly id: string,
    public readonly workflowKey: string,
    public readonly workflowVersion: string,
    public readonly organizationId: string,
    public readonly projectId: string,
    public state: WorkflowState,
    public readonly initiatedByUserId: string,
    public readonly idempotencyKey: string,
    public currentStepKey?: string,
    public errorCode?: string,
    public errorMessage?: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public startedAt?: Date,
    public completedAt?: Date
  ) {
    this.stateMachine = new WorkflowStateMachine()
    this.validate()
  }

  /**
   * Validate entity invariants
   */
  private validate(): void {
    const parsed = WorkflowRunSchema.safeParse({
      id: this.id,
      workflowKey: this.workflowKey,
      workflowVersion: this.workflowVersion,
      organizationId: this.organizationId,
      projectId: this.projectId,
      state: this.state,
      currentStepKey: this.currentStepKey,
      initiatedByUserId: this.initiatedByUserId,
      idempotencyKey: this.idempotencyKey,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    })

    if (!parsed.success) {
      throw new InvalidWorkflowStateError(`Invalid workflow run: ${parsed.error.message}`)
    }
  }

  /**
   * Transition workflow to new state
   * @throws InvalidStateTransitionError
   */
  transition(to: WorkflowState): void {
    const newState = this.stateMachine.transition(this.state, to)
    this.state = newState
    this.updatedAt = new Date()

    if (newState === WorkflowState.RUNNING && !this.startedAt) {
      this.startedAt = new Date()
    }

    if (this.stateMachine.isTerminal(newState) && !this.completedAt) {
      this.completedAt = new Date()
    }
  }

  /**
   * Check if workflow can transition to running
   */
  canStart(): boolean {
    return this.state === WorkflowState.QUEUED
  }

  /**
   * Check if workflow can be cancelled
   */
  canCancel(): boolean {
    return !this.stateMachine.isTerminal(this.state)
  }

  /**
   * Check if workflow is currently running
   */
  isRunning(): boolean {
    return this.state === WorkflowState.RUNNING
  }

  /**
   * Check if workflow is in terminal state
   */
  isTerminal(): boolean {
    return this.stateMachine.isTerminal(this.state)
  }

  /**
   * Record failure with error details
   */
  recordFailure(errorCode: string, errorMessage: string): void {
    this.errorCode = errorCode
    this.errorMessage = errorMessage
    this.transition(WorkflowState.FAILED)
  }

  /**
   * Get data as plain object for serialization
   */
  toData(): WorkflowRunData {
    return {
      id: this.id,
      workflowKey: this.workflowKey,
      workflowVersion: this.workflowVersion,
      organizationId: this.organizationId,
      projectId: this.projectId,
      state: this.state,
      currentStepKey: this.currentStepKey,
      initiatedByUserId: this.initiatedByUserId,
      idempotencyKey: this.idempotencyKey,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    }
  }

  /**
   * Create entity from data
   */
  static fromData(data: WorkflowRunData): WorkflowRunEntity {
    return new WorkflowRunEntity(
      data.id,
      data.workflowKey,
      data.workflowVersion,
      data.organizationId,
      data.projectId,
      data.state,
      data.initiatedByUserId,
      data.idempotencyKey,
      data.currentStepKey,
      data.errorCode,
      data.errorMessage,
      data.createdAt,
      data.updatedAt,
      data.startedAt,
      data.completedAt
    )
  }
}
