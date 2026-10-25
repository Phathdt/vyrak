import type { ArtifactEntity, CreateArtifactParams, IArtifactManager, IArtifactRepository } from '../../domain'

/**
 * Artifact manager service
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ArtifactManager implements IArtifactManager {
  // Warning threshold: 1MB
  private readonly LARGE_ARTIFACT_WARNING_SIZE = 1024 * 1024

  constructor(private readonly artifactRepository: IArtifactRepository) {}

  /**
   * Save artifact
   */
  async saveArtifact(params: CreateArtifactParams): Promise<string> {
    // Warn about large artifacts
    if (params.content.length > this.LARGE_ARTIFACT_WARNING_SIZE) {
      console.warn(`Large artifact detected: ${params.filePath} (${this.formatBytes(params.content.length)})`)
    }

    const artifact = await this.artifactRepository.create(params)
    return artifact.id
  }

  /**
   * Get artifact by ID
   */
  async getArtifact(artifactId: string): Promise<ArtifactEntity | null> {
    return this.artifactRepository.findById(artifactId)
  }

  /**
   * Get artifact content
   */
  async getArtifactContent(artifactId: string): Promise<string | null> {
    const artifact = await this.artifactRepository.findById(artifactId)
    return artifact?.content || null
  }

  /**
   * List artifacts by run
   */
  async listArtifactsByRun(runId: string): Promise<ArtifactEntity[]> {
    return this.artifactRepository.findByRunId(runId)
  }

  /**
   * List artifacts by organization
   */
  async listArtifactsByOrganization(organizationId: string): Promise<ArtifactEntity[]> {
    return this.artifactRepository.findByOrganization(organizationId)
  }

  /**
   * Delete artifact
   */
  async deleteArtifact(artifactId: string): Promise<void> {
    await this.artifactRepository.delete(artifactId)
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}
