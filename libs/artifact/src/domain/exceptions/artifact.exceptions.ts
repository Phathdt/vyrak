/**
 * Base domain error for the artifact module
 */
export class ArtifactDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when an artifact cannot be found for the current organization
 */
export class ArtifactNotFoundError extends ArtifactDomainError {
  constructor(public readonly artifactId: string) {
    super(`Artifact not found: ${artifactId}`)
  }
}

/**
 * Thrown when stored artifact content is missing from object storage
 */
export class ArtifactContentNotFoundError extends ArtifactDomainError {
  constructor(public readonly s3Key: string) {
    super(`Artifact content not found in storage: ${s3Key}`)
  }
}

/**
 * Thrown when an invalid approval state transition is attempted
 */
export class InvalidApprovalTransitionError extends ArtifactDomainError {
  constructor(
    public readonly artifactId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string
  ) {
    super(`Invalid approval transition for artifact ${artifactId}: cannot transition from ${fromStatus} to ${toStatus}`)
  }
}

/**
 * Thrown when trying to approve/reject an artifact that is not pending approval
 */
export class ArtifactNotPendingApprovalError extends ArtifactDomainError {
  constructor(
    public readonly artifactId: string,
    public readonly currentStatus: string
  ) {
    super(`Artifact ${artifactId} is not pending approval (current status: ${currentStatus})`)
  }
}
