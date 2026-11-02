import { BaseTenantRepository, DatabaseService } from '@vyrak/database'

import type { ArtifactEntity, ArtifactFilters, CreateArtifactInput, IArtifactRepository } from '../../domain'
import type { Artifact } from '@vyrak/database'

export class ArtifactPrismaRepository extends BaseTenantRepository implements IArtifactRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  private mapToEntity(raw: Artifact): ArtifactEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      phaseId: raw.phaseId,
      agentExecutionId: raw.agentExecutionId,
      key: raw.key,
      type: raw.type,
      title: raw.title,
      fileName: raw.fileName,
      s3Bucket: raw.s3Bucket,
      s3Key: raw.s3Key,
      mimeType: raw.mimeType,
      contentSize: raw.contentSize === null ? null : Number(raw.contentSize),
      checksum: raw.checksum,
      version: raw.version,
      metadata: raw.metadata as Record<string, unknown> | null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async create(input: CreateArtifactInput): Promise<ArtifactEntity> {
    return this.withTenantContext(async (organizationId) => {
      const artifact = await this.prisma.client.artifact.create({
        data: {
          organizationId,
          workflowId: input.workflowId,
          phaseId: input.phaseId,
          agentExecutionId: input.agentExecutionId,
          key: input.key,
          type: input.type,
          title: input.title,
          fileName: input.fileName,
          s3Bucket: input.s3Bucket,
          s3Key: input.s3Key,
          mimeType: input.mimeType,
          contentSize: input.contentSize === null ? null : BigInt(input.contentSize),
          checksum: input.checksum,
          version: input.version,
          metadata: (input.metadata ?? null) as never,
        },
      })

      return this.mapToEntity(artifact)
    })
  }

  async findById(id: string): Promise<ArtifactEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const artifact = await this.prisma.client.artifact.findFirst({
        where: { id, organizationId },
      })

      return artifact ? this.mapToEntity(artifact) : null
    })
  }

  async findByWorkflow(workflowId: string, filters: ArtifactFilters = {}): Promise<ArtifactEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const artifacts = await this.prisma.client.artifact.findMany({
        where: {
          organizationId,
          workflowId,
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.key ? { key: filters.key } : {}),
        },
        orderBy: [{ createdAt: 'asc' }, { version: 'desc' }],
      })

      return artifacts.map((artifact) => this.mapToEntity(artifact))
    })
  }

  async findByPhase(phaseId: string): Promise<ArtifactEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const artifacts = await this.prisma.client.artifact.findMany({
        where: { organizationId, phaseId },
        orderBy: { createdAt: 'asc' },
      })

      return artifacts.map((artifact) => this.mapToEntity(artifact))
    })
  }

  async findByType(workflowId: string, type: string): Promise<ArtifactEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const artifacts = await this.prisma.client.artifact.findMany({
        where: { organizationId, workflowId, type },
        orderBy: { createdAt: 'asc' },
      })

      return artifacts.map((artifact) => this.mapToEntity(artifact))
    })
  }

  async findByKey(workflowId: string, key: string): Promise<ArtifactEntity | null> {
    return this.findLatestVersion(workflowId, key)
  }

  async findLatestVersion(workflowId: string, key: string): Promise<ArtifactEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const artifact = await this.prisma.client.artifact.findFirst({
        where: { organizationId, workflowId, key },
        orderBy: { version: 'desc' },
      })

      return artifact ? this.mapToEntity(artifact) : null
    })
  }
}
