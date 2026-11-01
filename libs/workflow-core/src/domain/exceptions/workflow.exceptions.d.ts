/**
 * Base domain error for workflow module
 */
export declare class WorkflowDomainError extends Error {
  constructor(message: string)
}
/**
 * Thrown when a workflow is not found
 */
export declare class WorkflowNotFoundError extends WorkflowDomainError {
  readonly workflowId?: string | undefined
  constructor(workflowId?: string | undefined)
}
/**
 * Thrown when attempting an operation that requires a different workflow status
 */
export declare class InvalidWorkflowStatusError extends WorkflowDomainError {
  readonly operation: string
  readonly currentStatus?: string | undefined
  readonly allowedStatuses?: string[] | undefined
  constructor(operation: string, currentStatus?: string | undefined, allowedStatuses?: string[] | undefined)
}
/**
 * Thrown when workflow has no current phase
 */
export declare class NoCurrentPhaseError extends WorkflowDomainError {
  readonly workflowId?: string | undefined
  constructor(workflowId?: string | undefined)
}
/**
 * Thrown when workflow phases are not initialized
 */
export declare class PhasesNotInitializedError extends WorkflowDomainError {
  readonly workflowId?: string | undefined
  constructor(workflowId?: string | undefined)
}
/**
 * Thrown when a phase is not found
 */
export declare class PhaseNotFoundError extends WorkflowDomainError {
  readonly phaseKey: string
  constructor(phaseKey: string)
}
/**
 * Thrown when current phase cannot be found
 */
export declare class CurrentPhaseNotFoundError extends WorkflowDomainError {
  readonly phaseKey: string
  constructor(phaseKey: string)
}
/**
 * Thrown when attempting to approve a phase in an invalid state
 */
export declare class InvalidPhaseApprovalError extends WorkflowDomainError {
  readonly reason: string
  constructor(reason: string)
}
/**
 * Thrown when attempting to send back to a phase with invalid constraints
 */
export declare class InvalidPhaseSendBackError extends WorkflowDomainError {
  readonly reason: string
  constructor(reason: string)
}
/**
 * Thrown when brainstorming operation is invalid for current workflow state
 */
export declare class InvalidBrainstormingStateError extends WorkflowDomainError {
  readonly reason: string
  constructor(reason: string)
}
/**
 * Thrown when planning operation is invalid for current workflow state
 */
export declare class InvalidPlanningStateError extends WorkflowDomainError {
  readonly reason: string
  constructor(reason: string)
}
/**
 * Thrown when session is not found or invalid
 */
export declare class SessionError extends WorkflowDomainError {
  constructor(message: string)
}
//# sourceMappingURL=workflow.exceptions.d.ts.map
