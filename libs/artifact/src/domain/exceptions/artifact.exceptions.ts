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
