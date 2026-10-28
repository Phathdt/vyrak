import type { ArtifactEntity, CreateArtifactParams, IArtifactRepository } from '../../domain'

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
 * DEPRECATED: Prisma implementation of artifact repository
 *
 * This repository is kept for reference only.
 * Use ArtifactS3Repository for S3-backed storage.
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ArtifactPrismaRepository implements IArtifactRepository {
  /**
   * Create artifact
   * @deprecated Use ArtifactS3Repository instead
   */
  async create(_params: CreateArtifactParams): Promise<ArtifactEntity> {
    throw new Error('ArtifactPrismaRepository is deprecated. Use ArtifactS3Repository instead.')
  }

  /**
   * Find artifact by ID
   * @deprecated Use ArtifactS3Repository instead
   */
  async findById(_artifactId: string): Promise<ArtifactEntity | null> {
    throw new Error('ArtifactPrismaRepository is deprecated. Use ArtifactS3Repository instead.')
  }

  /**
   * Find artifacts by run ID
   * @deprecated Use ArtifactS3Repository instead
   */
  async findByRunId(_runId: string): Promise<ArtifactEntity[]> {
    throw new Error('ArtifactPrismaRepository is deprecated. Use ArtifactS3Repository instead.')
  }

  /**
   * Find artifacts by organization
   * @deprecated Use ArtifactS3Repository instead
   */
  async findByOrganization(_organizationId: string): Promise<ArtifactEntity[]> {
    throw new Error('ArtifactPrismaRepository is deprecated. Use ArtifactS3Repository instead.')
  }

  /**
   * Delete artifact
   * @deprecated Use ArtifactS3Repository instead
   */
  async delete(_artifactId: string): Promise<void> {
    throw new Error('ArtifactPrismaRepository is deprecated. Use ArtifactS3Repository instead.')
  }
}
