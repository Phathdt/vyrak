export class WorkflowPlanningDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when sub-task generation runs before an Implementation Plan artifact exists.
 */
export class ImplementationPlanNotFoundError extends WorkflowPlanningDomainError {
  constructor(public readonly workflowId: string) {
    super(`Implementation Plan artifact not found for workflow: ${workflowId}`)
  }
}
