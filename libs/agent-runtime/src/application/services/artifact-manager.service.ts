import type {
  ArtifactEntity,
  CreateArtifactParams,
  IArtifactManager,
  IArtifactRepository,
  IS3StorageProvider,
} from '../../domain'

/**
 * Artifact manager service
 * Orchestrates S3 storage and database persistence
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ArtifactManager implements IArtifactManager {
  // Warning threshold: 1MB
  private readonly LARGE_ARTIFACT_WARNING_SIZE = 1024 * 1024

  constructor(
    private readonly artifactRepository: IArtifactRepository,
    private readonly s3StorageProvider: IS3StorageProvider
  ) {}

  /**
   * Save artifact: upload to S3 then persist metadata
   */
  async saveArtifact(params: CreateArtifactParams): Promise<string> {
    // Warn about large artifacts
    if (params.content.length > this.LARGE_ARTIFACT_WARNING_SIZE) {
      console.warn(`Large artifact detected: ${params.filePath} (${this.formatBytes(params.content.length)})`)
    }

    // 1. Generate S3 key
    const s3Key = this.s3StorageProvider.generateKey(params.organizationId, params.runId, params.filePath)

    // 2. Upload to S3
    const { bucket } = await this.s3StorageProvider.upload(s3Key, params.content, 'text/plain')

    // 3. Persist metadata to database
    const artifact = await this.artifactRepository.create({
      ...params,
      s3Bucket: bucket,
      s3Key,
      contentSize: Buffer.byteLength(params.content, 'utf8'),
      contentType: 'text/plain',
    })

    return artifact.id
  }

  /**
   * Get artifact by ID with content from S3
   */
  async getArtifact(artifactId: string): Promise<ArtifactEntity | null> {
    const artifact = await this.artifactRepository.findById(artifactId)
    if (!artifact) return null

    // Fetch content from S3
    const content = await this.s3StorageProvider.download(artifact.s3Key)

    return {
      ...artifact,
      content,
    }
  }

  /**
   * Get artifact content from S3
   */
  async getArtifactContent(artifactId: string): Promise<string | null> {
    const artifact = await this.artifactRepository.findById(artifactId)
    if (!artifact) return null

    return this.s3StorageProvider.download(artifact.s3Key)
  }

  /**
   * List artifacts by run (metadata only, no content)
   */
  async listArtifactsByRun(runId: string): Promise<ArtifactEntity[]> {
    return this.artifactRepository.findByRunId(runId)
  }

  /**
   * List artifacts by organization (metadata only, no content)
   */
  async listArtifactsByOrganization(organizationId: string): Promise<ArtifactEntity[]> {
    return this.artifactRepository.findByOrganization(organizationId)
  }

  /**
   * Delete artifact: remove from S3 and database
   */
  async deleteArtifact(artifactId: string): Promise<void> {
    const artifact = await this.artifactRepository.findById(artifactId)
    if (!artifact) return

    // 1. Delete from S3
    await this.s3StorageProvider.delete(artifact.s3Key)

    // 2. Delete metadata from database
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
