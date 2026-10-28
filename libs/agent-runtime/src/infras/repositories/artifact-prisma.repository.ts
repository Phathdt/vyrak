import type { DatabaseService } from '@vyrak/database'

import type { ArtifactEntity, CreateArtifactParams, IArtifactRepository } from '../../domain'

/**
 * Extended params for repository layer with S3 metadata
 */
interface CreateArtifactWithS3Params extends CreateArtifactParams {
  s3Bucket: string
  s3Key: string
  contentSize: number
  contentType: string
}

/**
 * Artifact repository error
 */
export class ArtifactRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'ArtifactRepositoryError'
  }
}

/**
 * Prisma implementation of artifact repository
 * Handles metadata persistence only (content stored in S3)
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ArtifactPrismaRepository implements IArtifactRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create artifact metadata
   * Note: Content should be uploaded to S3 before calling this
   */
  async create(params: CreateArtifactWithS3Params): Promise<ArtifactEntity> {
    try {
      const artifact = await this.databaseService.client.artifact.create({
        data: {
          organizationId: params.organizationId,
          runId: params.runId,
          filePath: params.filePath,
          s3Bucket: params.s3Bucket,
          s3Key: params.s3Key,
          contentSize: params.contentSize,
          contentType: params.contentType,
        },
      })

      return this.mapToEntity(artifact)
    } catch (error) {
      throw new ArtifactRepositoryError(
        'Failed to create artifact metadata',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Find artifact by ID (metadata only)
   */
  async findById(artifactId: string): Promise<ArtifactEntity | null> {
    try {
      const artifact = await this.databaseService.client.artifact.findUnique({
        where: { id: artifactId },
      })

      return artifact ? this.mapToEntity(artifact) : null
    } catch (error) {
      throw new ArtifactRepositoryError(
        `Failed to find artifact ${artifactId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Find artifacts by run ID (metadata only)
   */
  async findByRunId(runId: string): Promise<ArtifactEntity[]> {
    try {
      const artifacts = await this.databaseService.client.artifact.findMany({
        where: { runId },
        orderBy: { createdAt: 'asc' },
      })

      return artifacts.map((a) => this.mapToEntity(a))
    } catch (error) {
      throw new ArtifactRepositoryError(
        `Failed to find artifacts for run ${runId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Find artifacts by organization (metadata only)
   */
  async findByOrganization(organizationId: string): Promise<ArtifactEntity[]> {
    try {
      const artifacts = await this.databaseService.client.artifact.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      })

      return artifacts.map((a) => this.mapToEntity(a))
    } catch (error) {
      throw new ArtifactRepositoryError(
        `Failed to find artifacts for organization ${organizationId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Delete artifact metadata
   * Note: S3 content should be deleted separately
   */
  async delete(artifactId: string): Promise<void> {
    try {
      await this.databaseService.client.artifact.delete({
        where: { id: artifactId },
      })
    } catch (error) {
      throw new ArtifactRepositoryError(
        `Failed to delete artifact ${artifactId}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Map Prisma model to domain entity
   */
  private mapToEntity(artifact: {
    id: string
    organizationId: string
    runId: string
    filePath: string
    s3Bucket: string
    s3Key: string
    contentSize: number
    contentType: string
    createdAt: Date
  }): ArtifactEntity {
    return {
      id: artifact.id,
      organizationId: artifact.organizationId,
      runId: artifact.runId,
      filePath: artifact.filePath,
      s3Bucket: artifact.s3Bucket,
      s3Key: artifact.s3Key,
      contentSize: artifact.contentSize,
      contentType: artifact.contentType,
      content: '', // Empty - content fetched from S3 by service layer
      createdAt: artifact.createdAt,
    }
  }
}
