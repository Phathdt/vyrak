/**
 * Artifact interfaces for workflow-core
 * Shared between approval step executor and approval validator
 */

/**
 * Artifact entity representing plan artifacts
 * Content can be string (raw) or object (parsed)
 */
export interface IArtifact {
  id: string
  content: string | Record<string, unknown>
}

/**
 * Artifact repository interface for retrieving artifacts
 */
export interface IArtifactRepository {
  findById(id: string): Promise<IArtifact | null>
}
