/**
 * Domain errors for workflow approval operations
 */

export class InvalidStepTypeError extends Error {
  constructor(actual: string, expected: string) {
    super(`Invalid step type: expected ${expected}, got ${actual}`)
    this.name = 'InvalidStepTypeError'
  }
}

export class MissingPlanArtifactError extends Error {
  constructor(stepKey: string) {
    super(`Missing plan artifact from previous step: ${stepKey}`)
    this.name = 'MissingPlanArtifactError'
  }
}

export class ArtifactNotFoundError extends Error {
  constructor(artifactId: string) {
    super(`Artifact not found: ${artifactId}`)
    this.name = 'ArtifactNotFoundError'
  }
}

export class WorkflowRunNotFoundError extends Error {
  constructor(runId: string) {
    super(`Workflow run not found: ${runId}`)
    this.name = 'WorkflowRunNotFoundError'
  }
}

export class WorkflowApprovalNotFoundError extends Error {
  constructor(runId: string) {
    super(`Workflow approval not found for run: ${runId}`)
    this.name = 'WorkflowApprovalNotFoundError'
  }
}

export class ApprovalAlreadyDecidedError extends Error {
  constructor(approvalId: string) {
    super(`Approval already decided: ${approvalId}`)
    this.name = 'ApprovalAlreadyDecidedError'
  }
}

export class UnauthorizedAccessError extends Error {
  constructor(message: string) {
    super(`Unauthorized: ${message}`)
    this.name = 'UnauthorizedAccessError'
  }
}

export class StaleApprovalError extends Error {
  constructor(message: string) {
    super(`Stale approval: ${message}`)
    this.name = 'StaleApprovalError'
  }
}
