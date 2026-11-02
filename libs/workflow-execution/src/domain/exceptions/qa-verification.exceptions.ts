export class QAVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QAVerificationError'
  }
}

export class PRDNotFoundError extends QAVerificationError {
  constructor(
    public readonly workflowId: string,
    public readonly phaseId: string
  ) {
    super(`PRD artifact not found for workflow ${workflowId}`)
    this.name = 'PRDNotFoundError'
  }
}

export class QAExecutionError extends QAVerificationError {
  constructor(
    public readonly workflowId: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'QAExecutionError'
  }
}
