import type { ArtifactEntity } from './artifact-repository.interface'
import type { PresignedUrlResult } from './s3-storage-provider.interface'

/**
 * Parameters for generating pre-signed upload URL
 */
export interface GenerateUploadUrlParams {
  organizationId: string
  runId: string
  filePath: string
  contentType?: string
}

/**
 * Parameters for confirming artifact upload
 */
export interface ConfirmUploadParams {
  organizationId: string
  runId: string
  filePath: string
  s3Key: string
  s3Bucket: string
  contentSize: number
  contentType: string
}

/**
 * Artifact Manager Interface
 * Orchestrates S3 storage and database persistence
 */
export interface IArtifactManager {
  /**
   * Generate pre-signed URL for direct S3 upload (client-side)
   */
  generateUploadUrl(params: GenerateUploadUrlParams): Promise<PresignedUrlResult>

  /**
   * Confirm artifact upload and save metadata (client-side)
   */
  confirmUpload(params: ConfirmUploadParams): Promise<string>

  /**
   * Save artifact directly (server-side: worker)
   * Uploads content to S3 and saves metadata in one call
   */
  saveArtifact(params: { organizationId: string; runId: string; filePath: string; content: string }): Promise<string>

  /**
   * Delete artifact (metadata + S3)
   */
  deleteArtifact(artifactId: string): Promise<void>

  /**
   * Get artifact by ID
   */
  getArtifact(artifactId: string): Promise<ArtifactEntity | null>

  /**
   * Get artifact content from S3
   */
  getArtifactContent(artifactId: string): Promise<string | null>

  /**
   * List artifacts by run
   */
  listArtifactsByRun(runId: string): Promise<ArtifactEntity[]>
}
