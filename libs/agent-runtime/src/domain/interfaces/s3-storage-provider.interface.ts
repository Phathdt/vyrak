/**
 * S3 storage provider interface
 * Abstracts object storage operations
 */
export interface IS3StorageProvider {
  /**
   * Upload content to S3
   * @param key - S3 object key
   * @param content - Content to upload
   * @param contentType - MIME type (default: text/plain)
   * @returns S3 bucket and key
   */
  upload(key: string, content: string, contentType?: string): Promise<{ bucket: string; key: string }>

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
}
