import { z } from 'zod'

import { InvalidWorkflowStateError } from '../errors/invalid-workflow-state.error'
import { WorkflowState, WorkflowStateMachine } from '../workflow-state'

/**
 * Schema for WorkflowRun validation
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
  idempotencyKey: z.string().uuid().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
})

export type WorkflowRun = z.infer<typeof WorkflowRunSchema>

/**
 * Validate a workflow run against domain invariants
 * @throws InvalidWorkflowStateError
 */
function validateWorkflowRun(run: WorkflowRun): void {
  const parsed = WorkflowRunSchema.safeParse(run)

  if (!parsed.success) {
    throw new InvalidWorkflowStateError(`Invalid workflow run: ${parsed.error.message}`)
  }
}

/**
 * Create a new workflow run with the given data
 * Validates all invariants before creation
 * @throws InvalidWorkflowStateError
 */
export function createWorkflowRun(
  data: Partial<WorkflowRun> &
    Pick<WorkflowRun, 'id' | 'workflowKey' | 'workflowVersion' | 'organizationId' | 'projectId' | 'initiatedByUserId'>
): WorkflowRun {
  const now = new Date()
  const run: WorkflowRun = {
    state: WorkflowState.QUEUED,
    createdAt: now,
    updatedAt: now,
    ...data,
  }

  validateWorkflowRun(run)
  return run
}

/**
 * Check if workflow can transition to running state
 */
export function canStartWorkflow(run: WorkflowRun): boolean {
  return run.state === WorkflowState.QUEUED
}

/**
 * Check if workflow can be cancelled
 */
export function canCancelWorkflow(run: WorkflowRun): boolean {
  const stateMachine = new WorkflowStateMachine()
  return !stateMachine.isTerminal(run.state)
}

/**
 * Check if workflow is currently running
 */
export function isRunning(run: WorkflowRun): boolean {
  return run.state === WorkflowState.RUNNING
}

/**
 * Check if workflow is in terminal state
 */
export function isTerminal(run: WorkflowRun): boolean {
  const stateMachine = new WorkflowStateMachine()
  return stateMachine.isTerminal(run.state)
}

/**
 * Transition workflow to a new state with automatic timestamp management
 * @throws InvalidStateTransitionError
 * @returns New workflow run object (immutable)
 */
export function transitionWorkflow(run: WorkflowRun, to: WorkflowState): WorkflowRun {
  const stateMachine = new WorkflowStateMachine()
  const newState = stateMachine.transition(run.state, to)

  const updated: WorkflowRun = {
    ...run,
    state: newState,
    updatedAt: new Date(),
  }

  // Set startedAt only on first transition to RUNNING
  if (newState === WorkflowState.RUNNING && !run.startedAt) {
    updated.startedAt = new Date()
  }

  // Set completedAt when entering terminal state
  if (stateMachine.isTerminal(newState) && !run.completedAt) {
    updated.completedAt = new Date()
  }

  validateWorkflowRun(updated)
  return updated
}

/**
 * Record a failure with error details and transition to FAILED state
 * @throws InvalidStateTransitionError
 * @returns New workflow run object with error details (immutable)
 */
export function recordFailure(run: WorkflowRun, errorCode: string, errorMessage: string): WorkflowRun {
  const withError: WorkflowRun = {
    ...run,
    errorCode,
    errorMessage,
  }

  return transitionWorkflow(withError, WorkflowState.FAILED)
}
