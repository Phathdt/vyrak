/**
 * Pre-signed URL response
 */
export interface PresignedUrlResult {
  uploadUrl: string
  s3Key: string
  bucket: string
  expiresIn: number
}

/**
 * S3 storage provider interface
 * Abstracts object storage operations
 */
export interface IS3StorageProvider {
  /**
   * Generate pre-signed URL for direct client upload
   * @param key - S3 object key
   * @param contentType - MIME type (default: text/plain)
   * @param expiresIn - URL expiration in seconds (default: 3600)
   * @returns Pre-signed URL and metadata
   */
  generatePresignedUrl(key: string, contentType?: string, expiresIn?: number): Promise<PresignedUrlResult>

  /**
   * Upload content directly to S3 (server-side: worker)
   * @param key - S3 object key
   * @param content - Content to upload
   * @param contentType - MIME type (default: text/plain)
   */
  upload(key: string, content: string, contentType?: string): Promise<void>

  /**
   * Download content from S3
   * @param key - S3 object key
   * @returns Content as string
   */
  download(key: string): Promise<string>

  /**
   * Delete object from S3
   * @param key - S3 object key
   */
  delete(key: string): Promise<void>

  /**
   * Generate S3 key for artifact
   * @param organizationId - Organization ID
   * @param runId - Workflow run ID
   * @param filePath - File path
   * @returns S3 key
   */
  generateKey(organizationId: string, runId: string, filePath: string): string

  /**
   * Get bucket name
   * @returns S3 bucket name
   */
  getBucket(): string
}
