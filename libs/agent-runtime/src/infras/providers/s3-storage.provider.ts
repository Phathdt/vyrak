import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3'

import type { IS3StorageProvider } from '../../domain'

/**
 * S3 storage provider error
 */
export class S3StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'S3StorageError'
  }
}

/**
 * S3 storage provider implementation
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class S3StorageProvider implements IS3StorageProvider {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucket: string
  ) {}

  /**
   * Upload content to S3
   */
  async upload(
    key: string,
    content: string,
    contentType: string = 'text/plain'
  ): Promise<{ bucket: string; key: string }> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: content,
          ContentType: contentType,
        })
      )

      return { bucket: this.bucket, key }
    } catch (error) {
      throw new S3StorageError(`Failed to upload to S3: ${key}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Download content from S3
   */
  async download(key: string): Promise<string> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      if (!response.Body) {
        throw new S3StorageError(`S3 object has no body: ${key}`)
      }

      return await response.Body.transformToString()
    } catch (error) {
      throw new S3StorageError(`Failed to download from S3: ${key}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Delete object from S3
   */
  async delete(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
    } catch (error) {
      throw new S3StorageError(`Failed to delete from S3: ${key}`, error instanceof Error ? error : undefined)
    }
  }

  /**
   * Generate S3 key for artifact
   */
  generateKey(organizationId: string, runId: string, filePath: string): string {
    return `${organizationId}/${runId}/${filePath}`
  }
}
