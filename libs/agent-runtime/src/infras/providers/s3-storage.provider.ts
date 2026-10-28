import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { IS3StorageProvider, PresignedUrlResult } from '../../domain'

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
   * Generate pre-signed URL for direct client upload
   */
  async generatePresignedUrl(
    key: string,
    contentType: string = 'text/plain',
    expiresIn: number = 3600
  ): Promise<PresignedUrlResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      })

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn })

      return {
        uploadUrl,
        s3Key: key,
        bucket: this.bucket,
        expiresIn,
      }
    } catch (error) {
      throw new S3StorageError(
        `Failed to generate presigned URL for: ${key}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Upload content directly to S3 (server-side: worker)
   */
  async upload(key: string, content: string, contentType = 'text/plain'): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: contentType,
    })

    await this.s3Client.send(command)
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

  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.bucket
  }
}
