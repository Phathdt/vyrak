import type { ArtifactEntity, CreateArtifactParams } from './artifact-repository.interface'

/**
 * Artifact manager interface
 */
export interface IArtifactManager {
  /**
   * Save artifact
   */
  saveArtifact(params: CreateArtifactParams): Promise<string>

  /**
   * Get artifact by ID
   */
  getArtifact(artifactId: string): Promise<ArtifactEntity | null>

  /**
   * Get artifact content
   */
  getArtifactContent(artifactId: string): Promise<string | null>

  /**
   * List artifacts by run
   */
  listArtifactsByRun(runId: string): Promise<ArtifactEntity[]>

  /**
   * Delete artifact
   */
  deleteArtifact(artifactId: string): Promise<void>
}
