import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'

import type { IStorageService } from '../../domain'
import type { S3Config } from '@vyrak/custom-config'

export interface S3StorageServiceOptions {
  client?: S3Client
}

/**
 * Object storage adapter for artifact content.
 *
 * Works against AWS S3 and S3-compatible servers (Floci, LocalStack, MinIO).
 * Configuration comes from the shared `s3` config block; `S3__*` environment
 * variables override `config/{env}.yaml`.
 */
export class S3StorageService implements IStorageService {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: S3Config, options: S3StorageServiceOptions = {}) {
    this.bucket = config.bucket
    this.client =
      options.client ??
      new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      })
  }

  getBucket(): string {
    return this.bucket
  }

  async upload(
    key: string,
    content: string,
    contentType = 'text/markdown'
  ): Promise<{ size: number; checksum: string }> {
    const body = Buffer.from(content, 'utf8')

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.byteLength,
      })
    )

    return {
      size: body.byteLength,
      checksum: createHash('sha256').update(body).digest('hex'),
    }
  }

  async download(key: string): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )

    const body = response.Body as { transformToString?: (encoding?: string) => Promise<string> } | undefined
    if (!body?.transformToString) {
      throw new Error(`Object body cannot be read as text: ${this.bucket}/${key}`)
    }

    return body.transformToString('utf-8')
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }
}
