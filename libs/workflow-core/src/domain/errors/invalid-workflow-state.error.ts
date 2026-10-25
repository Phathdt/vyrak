/**
 * Domain error for invalid workflow state
 */
export class InvalidWorkflowStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWorkflowStateError'
  }
}
