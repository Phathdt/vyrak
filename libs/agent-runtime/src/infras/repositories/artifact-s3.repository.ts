import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { DatabaseService } from '@vyrak/database'

import type { ArtifactEntity, CreateArtifactParams, IArtifactRepository } from '../../domain'

/**
 * S3 repository error
 */
export class ArtifactS3RepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'ArtifactS3RepositoryError'
  }
}

/**
 * S3 implementation of artifact repository
 *
 * 100% S3 storage strategy:
 * - Metadata stored in PostgreSQL
 * - Content stored in S3
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ArtifactS3Repository implements IArtifactRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly s3Client: S3Client,
    private readonly bucket: string
  ) {}

  /**
   * Generate S3 key from artifact metadata
   * Format: {organizationId}/{runId}/{filePath}
   */
  private generateS3Key(organizationId: string, runId: string, filePath: string): string {
    return `${organizationId}/${runId}/${filePath}`
  }

  /**
   * Create artifact - upload to S3 and save metadata to DB
   */
  async create(params: CreateArtifactParams): Promise<ArtifactEntity> {
    const s3Key = this.generateS3Key(params.organizationId, params.runId, params.filePath)

    try {
      // 1. Upload content to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: params.content,
          ContentType: 'text/plain',
        })
      )

      // 2. Save metadata to database
      const artifact = await this.db.client.artifact.create({
        data: {
          organizationId: params.organizationId,
          runId: params.runId,
          filePath: params.filePath,
          s3Bucket: this.bucket,
          s3Key: s3Key,
          contentSize: Buffer.byteLength(params.content, 'utf-8'),
          contentType: 'text/plain',
        },
      })

      return this.mapToEntity(artifact, params.content)
    } catch (error) {
      throw new ArtifactS3RepositoryError(
        `Failed to create artifact: ${params.filePath}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Find artifact by ID - fetch metadata from DB, content from S3
   */
  async findById(artifactId: string): Promise<ArtifactEntity | null> {
    try {
      // 1. Get metadata from database
      const artifact = await this.db.client.artifact.findUnique({
        where: { id: artifactId },
      })

      if (!artifact) {
        return null
      }

      // 2. Fetch content from S3
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: artifact.s3Bucket,
          Key: artifact.s3Key,
        })
      )

      const content = await response.Body?.transformToString()
      if (!content) {
        throw new Error('Empty S3 response body')
      }

      return this.mapToEntity(artifact, content)
    } catch (error) {
      throw new ArtifactS3RepositoryError(
        `Failed to find artifact ${artifactId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Find artifacts by run ID
   * Returns metadata only (no content) for list operations
   */
  async findByRunId(runId: string): Promise<ArtifactEntity[]> {
    try {
      const artifacts = await this.db.client.artifact.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      })

      // Return metadata only, content can be fetched on-demand via findById
      return artifacts.map((a) => this.mapToEntity(a, ''))
    } catch (error) {
      throw new ArtifactS3RepositoryError(
        `Failed to find artifacts for run ${runId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Find artifacts by organization
   * Returns metadata only (no content) for list operations
   */
  async findByOrganization(organizationId: string): Promise<ArtifactEntity[]> {
    try {
      const artifacts = await this.db.client.artifact.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      })

      // Return metadata only
      return artifacts.map((a) => this.mapToEntity(a, ''))
    } catch (error) {
      throw new ArtifactS3RepositoryError(
        `Failed to find artifacts for organization ${organizationId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Delete artifact - remove from S3 and DB
   */
  async delete(artifactId: string): Promise<void> {
    try {
      // 1. Get artifact metadata
      const artifact = await this.db.client.artifact.findUnique({
        where: { id: artifactId },
      })

      if (!artifact) {
        throw new Error(`Artifact ${artifactId} not found`)
      }

      // 2. Delete from S3
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: artifact.s3Bucket,
          Key: artifact.s3Key,
        })
      )

      // 3. Delete from database
      await this.db.client.artifact.delete({
        where: { id: artifactId },
      })
    } catch (error) {
      throw new ArtifactS3RepositoryError(
        `Failed to delete artifact ${artifactId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Map Prisma model to domain entity
   */
  private mapToEntity(
    artifact: {
      id: string
      organizationId: string
      runId: string
      filePath: string
      s3Bucket: string
      s3Key: string
      contentSize: number
      contentType: string
      createdAt: Date
    },
    content: string
  ): ArtifactEntity {
    return {
      id: artifact.id,
      organizationId: artifact.organizationId,
      runId: artifact.runId,
      filePath: artifact.filePath,
      s3Bucket: artifact.s3Bucket,
      s3Key: artifact.s3Key,
      contentSize: artifact.contentSize,
      contentType: artifact.contentType,
      content, // Content from S3 or empty for list operations
      createdAt: artifact.createdAt,
    }
  }
}
