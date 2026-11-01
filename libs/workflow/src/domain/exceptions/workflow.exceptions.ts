/**
 * Base domain error for workflow module
 */
export class WorkflowDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when a workflow is not found
 */
export class WorkflowNotFoundError extends WorkflowDomainError {
  constructor(public readonly workflowId?: string) {
    super(workflowId ? `Workflow not found: ${workflowId}` : 'Workflow not found')
  }
}

/**
 * Thrown when attempting an operation that requires a different workflow status
 */
export class InvalidWorkflowStatusError extends WorkflowDomainError {
  constructor(
    public readonly operation: string,
    public readonly currentStatus?: string,
    public readonly allowedStatuses?: string[]
  ) {
    const statusInfo = currentStatus ? ` Current status: ${currentStatus}.` : ''
    const allowedInfo = allowedStatuses?.length ? ` Allowed: ${allowedStatuses.join(', ')}.` : ''
    super(`${operation}.${statusInfo}${allowedInfo}`)
  }
}

/**
 * Thrown when workflow has no current phase
 */
export class NoCurrentPhaseError extends WorkflowDomainError {
  constructor(public readonly workflowId?: string) {
    super('Workflow has no current phase')
  }
}

/**
 * Thrown when workflow phases are not initialized
 */
export class PhasesNotInitializedError extends WorkflowDomainError {
  constructor(public readonly workflowId?: string) {
    super('Workflow phases are not initialized')
  }
}

/**
 * Thrown when a phase is not found
 */
export class PhaseNotFoundError extends WorkflowDomainError {
  constructor(public readonly phaseKey: string) {
    super(`Phase not found: ${phaseKey}`)
  }
}

/**
 * Thrown when current phase cannot be found
 */
export class CurrentPhaseNotFoundError extends WorkflowDomainError {
  constructor(public readonly phaseKey: string) {
    super(`Current phase "${phaseKey}" was not found`)
  }
}

/**
 * Thrown when attempting to approve a phase in an invalid state
 */
export class InvalidPhaseApprovalError extends WorkflowDomainError {
  constructor(public readonly reason: string) {
    super(reason)
  }
}

/**
 * Thrown when attempting to send back to a phase with invalid constraints
 */
export class InvalidPhaseSendBackError extends WorkflowDomainError {
  constructor(public readonly reason: string) {
    super(reason)
  }
}

/**
 * Thrown when brainstorming operation is invalid for current workflow state
 */
export class InvalidBrainstormingStateError extends WorkflowDomainError {
  constructor(public readonly reason: string) {
    super(reason)
  }
}

/**
 * Thrown when planning operation is invalid for current workflow state
 */
export class InvalidPlanningStateError extends WorkflowDomainError {
  constructor(public readonly reason: string) {
    super(reason)
  }
}

/**
 * Thrown when session is not found or invalid
 */
export class SessionError extends WorkflowDomainError {
  constructor(message: string) {
    super(message)
  }
}
