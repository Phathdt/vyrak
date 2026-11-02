export class CodeReviewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CodeReviewError'
  }
}

export class NoImplementationArtifactsError extends CodeReviewError {
  constructor(
    public readonly workflowId: string,
    public readonly phaseId: string
  ) {
    super(`No implementation artifacts found for workflow ${workflowId}, phase ${phaseId}`)
    this.name = 'NoImplementationArtifactsError'
  }
}

export class CodeReviewReportNotFoundError extends CodeReviewError {
  constructor(
    public readonly workflowId: string,
    public readonly phaseId: string
  ) {
    super(`Code review report not found for workflow ${workflowId}, phase ${phaseId}`)
    this.name = 'CodeReviewReportNotFoundError'
  }
}
