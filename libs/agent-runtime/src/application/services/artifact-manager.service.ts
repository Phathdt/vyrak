import type {
  ArtifactEntity,
  ConfirmUploadParams,
  GenerateUploadUrlParams,
  IArtifactManager,
  IArtifactRepository,
  IS3StorageProvider,
  PresignedUrlResult,
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
   * Generate pre-signed URL for direct S3 upload
   */
  async generateUploadUrl(params: GenerateUploadUrlParams): Promise<PresignedUrlResult> {
    // Generate S3 key
    const s3Key = this.s3StorageProvider.generateKey(params.organizationId, params.runId, params.filePath)

    // Generate pre-signed URL
    return this.s3StorageProvider.generatePresignedUrl(s3Key, params.contentType || 'text/plain', 3600)
  }

  /**
   * Confirm artifact upload and save metadata
   */
  async confirmUpload(params: ConfirmUploadParams): Promise<string> {
    // Warn about large artifacts
    if (params.contentSize > this.LARGE_ARTIFACT_WARNING_SIZE) {
      console.warn(`Large artifact detected: ${params.filePath} (${this.formatBytes(params.contentSize)})`)
    }

    // Save metadata to database
    const artifact = await this.artifactRepository.create({
      organizationId: params.organizationId,
      runId: params.runId,
      filePath: params.filePath,
      s3Bucket: params.s3Bucket,
      s3Key: params.s3Key,
      contentSize: params.contentSize,
      contentType: params.contentType,
    })

    return artifact.id
  }

  /**
   * Save artifact directly (server-side: worker)
   * Uploads content to S3 and saves metadata in one call
   */
  async saveArtifact(params: {
    organizationId: string
    runId: string
    filePath: string
    content: string
  }): Promise<string> {
    const contentBuffer = Buffer.from(params.content, 'utf-8')
    const contentSize = contentBuffer.length

    // Warn about large artifacts
    if (contentSize > this.LARGE_ARTIFACT_WARNING_SIZE) {
      console.warn(`Large artifact detected: ${params.filePath} (${this.formatBytes(contentSize)})`)
    }

    // Generate S3 key
    const s3Key = this.s3StorageProvider.generateKey(params.organizationId, params.runId, params.filePath)

    // Upload to S3 directly (no pre-signed URL needed for server-side)
    await this.s3StorageProvider.upload(s3Key, params.content, 'text/plain')

    // Save metadata to database
    const artifact = await this.artifactRepository.create({
      organizationId: params.organizationId,
      runId: params.runId,
      filePath: params.filePath,
      s3Bucket: this.s3StorageProvider.getBucket(),
      s3Key,
      contentSize,
      contentType: 'text/plain',
    })

    return artifact.id
  }

  /**
   * Delete artifact (metadata + S3)
   */
  async deleteArtifact(artifactId: string): Promise<void> {
    const artifact = await this.artifactRepository.findById(artifactId)
    if (!artifact) return

    // Delete from S3
    await this.s3StorageProvider.delete(artifact.s3Key)

    // Delete metadata from database
    await this.artifactRepository.delete(artifactId)
  }

  /**
   * Get artifact by ID (metadata only)
   */
  async getArtifact(artifactId: string): Promise<ArtifactEntity | null> {
    return this.artifactRepository.findById(artifactId)
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
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
}
