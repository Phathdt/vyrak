import { z } from 'zod'

import { InvalidStateTransitionError } from './errors/invalid-state-transition.error'

/**
 * Workflow lifecycle states per PRD Section 3 (FR-03)
 */
export enum WorkflowState {
  QUEUED = 'queued',
  RUNNING = 'running',
  WAITING_APPROVAL = 'waiting_approval',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const WorkflowStateSchema = z.nativeEnum(WorkflowState)

/**
 * Valid state transitions map
 * Key: from state, Value: array of valid destination states
 */
const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.QUEUED]: [WorkflowState.RUNNING, WorkflowState.CANCELLED],
  [WorkflowState.RUNNING]: [
    WorkflowState.WAITING_APPROVAL,
    WorkflowState.SUCCEEDED,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  [WorkflowState.WAITING_APPROVAL]: [
    WorkflowState.RUNNING,
    WorkflowState.SUCCEEDED,
    WorkflowState.FAILED,
    WorkflowState.CANCELLED,
  ],
  // Terminal states
  [WorkflowState.SUCCEEDED]: [],
  [WorkflowState.FAILED]: [],
  [WorkflowState.CANCELLED]: [],
}

/**
 * Workflow state machine - validates transitions
 */
export class WorkflowStateMachine {
  /**
   * Check if transition is valid without throwing
   */
  canTransition(from: WorkflowState, to: WorkflowState): boolean {
    if (!from || !to) return false
    const validDest = VALID_TRANSITIONS[from]
    return validDest ? validDest.includes(to) : false
  }

  /**
   * Execute transition, throw on invalid
   * @throws InvalidStateTransitionError
   */
  transition(from: WorkflowState, to: WorkflowState): WorkflowState {
    if (!this.canTransition(from, to)) {
      throw new InvalidStateTransitionError(`Cannot transition from ${from} to ${to}`)
    }
    return to
  }

  /**
   * Check if state is terminal (no further transitions possible)
   */
  isTerminal(state: WorkflowState): boolean {
    return VALID_TRANSITIONS[state].length === 0
  }

  /**
   * Get all valid next states from current state
   */
  getValidNextStates(from: WorkflowState): WorkflowState[] {
    return VALID_TRANSITIONS[from] ?? []
  }
}
