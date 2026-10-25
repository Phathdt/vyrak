import type { PrismaClient } from '@vyrak/database'

import type {
  ArtifactEntity,
  CreateArtifactParams,
  IArtifactRepository,
} from '../../domain/interfaces/artifact-repository.interface'

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
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ArtifactPrismaRepository implements IArtifactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create artifact
   */
  async create(params: CreateArtifactParams): Promise<ArtifactEntity> {
    try {
      const artifact = await this.prisma.artifact.create({
        data: {
          organizationId: params.organizationId,
          runId: params.runId,
          filePath: params.filePath,
          content: params.content,
        },
      })

      return this.mapToEntity(artifact)
    } catch (error) {
      throw new ArtifactRepositoryError('Failed to create artifact', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Find artifact by ID
   */
  async findById(artifactId: string): Promise<ArtifactEntity | null> {
    try {
      const artifact = await this.prisma.artifact.findUnique({
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
   * Find artifacts by run ID
   */
  async findByRunId(runId: string): Promise<ArtifactEntity[]> {
    try {
      const artifacts = await this.prisma.artifact.findMany({
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
   * Find artifacts by organization
   */
  async findByOrganization(organizationId: string): Promise<ArtifactEntity[]> {
    try {
      const artifacts = await this.prisma.artifact.findMany({
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
   * Delete artifact
   */
  async delete(artifactId: string): Promise<void> {
    try {
      await this.prisma.artifact.delete({
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
    content: string
    createdAt: Date
  }): ArtifactEntity {
    return {
      id: artifact.id,
      organizationId: artifact.organizationId,
      runId: artifact.runId,
      filePath: artifact.filePath,
      content: artifact.content,
      createdAt: artifact.createdAt,
    }
  }
}
