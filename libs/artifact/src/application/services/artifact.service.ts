import {
  ArtifactNotFoundError,
  ArtifactNotPendingApprovalError,
  InvalidApprovalTransitionError,
} from '../../domain/exceptions/artifact.exceptions'

import type {
  ArtifactEntity,
  ArtifactFilters,
  IArtifactRepository,
  IArtifactService,
  IStorageService,
  ParsedArtifact,
  UploadArtifactOptions,
} from '../../domain'

const ARTIFACT_TAG_REGEX = /<artifact\b([^>]*)>([\s\S]*?)<\/artifact>/g
const ATTRIBUTE_REGEX = /(\w+)\s*=\s*"([^"]*)"/g

export class ArtifactService implements IArtifactService {
  constructor(
    private readonly repository: IArtifactRepository,
    private readonly storage: IStorageService
  ) {}

  async uploadArtifact(
    workflowId: string,
    type: string,
    key: string,
    title: string,
    content: string,
    options: UploadArtifactOptions = {}
  ): Promise<ArtifactEntity> {
    const previous = await this.repository.findLatestVersion(workflowId, key)
    const version = previous ? previous.version + 1 : 1

    const mimeType = options.mimeType ?? 'text/markdown'
    const s3Key = this.buildStorageKey(workflowId, key, version)

    const { size, checksum } = await this.storage.upload(s3Key, content, mimeType)

    return this.repository.create({
      workflowId,
      phaseId: options.phaseId ?? null,
      agentExecutionId: options.agentExecutionId ?? null,
      key,
      type,
      title,
      fileName: options.fileName ?? `${key}.md`,
      s3Bucket: this.storage.getBucket(),
      s3Key,
      mimeType,
      contentSize: size,
      checksum,
      version,
      metadata: options.metadata ?? null,
    })
  }

  async getArtifact(id: string): Promise<ArtifactEntity> {
    const artifact = await this.repository.findById(id)
    if (!artifact) {
      throw new ArtifactNotFoundError(id)
    }
    return artifact
  }

  async downloadArtifact(id: string): Promise<{ artifact: ArtifactEntity; content: string }> {
    const artifact = await this.getArtifact(id)
    const content = await this.storage.download(artifact.s3Key)

    return { artifact, content }
  }

  async listWorkflowArtifacts(workflowId: string, filters: ArtifactFilters = {}): Promise<ArtifactEntity[]> {
    return this.repository.findByWorkflow(workflowId, filters)
  }

  async listPhaseArtifacts(phaseId: string): Promise<ArtifactEntity[]> {
    return this.repository.findByPhase(phaseId)
  }

  parseArtifactTags(aiResponse: string): ParsedArtifact[] {
    const artifacts: ParsedArtifact[] = []

    for (const match of aiResponse.matchAll(ARTIFACT_TAG_REGEX)) {
      const [, rawAttributes, rawContent] = match
      const attributes = this.parseAttributes(rawAttributes)
      const type = attributes.type
      const content = rawContent.trim()

      if (!type || !content) {
        continue
      }

      artifacts.push({
        type,
        key: attributes.key || type,
        title: attributes.title || type,
        format: attributes.format || 'markdown',
        content,
      })
    }

    return artifacts
  }

  async requestApproval(artifactId: string): Promise<ArtifactEntity> {
    const artifact = await this.getArtifact(artifactId)

    // Validate state transition
    if (artifact.approvalStatus !== 'DRAFT' && artifact.approvalStatus !== 'REJECTED') {
      throw new InvalidApprovalTransitionError(artifactId, artifact.approvalStatus, 'PENDING_APPROVAL')
    }

    return this.repository.updateApprovalStatus(artifactId, {
      approvalStatus: 'PENDING_APPROVAL',
      approvedById: null,
      approvedAt: null,
      rejectionReason: null,
    })
  }

  async approve(artifactId: string, approverId: string): Promise<ArtifactEntity> {
    const artifact = await this.getArtifact(artifactId)

    // Validate artifact is pending approval
    if (artifact.approvalStatus !== 'PENDING_APPROVAL') {
      throw new ArtifactNotPendingApprovalError(artifactId, artifact.approvalStatus)
    }

    return this.repository.updateApprovalStatus(artifactId, {
      approvalStatus: 'APPROVED',
      approvedById: approverId,
      approvedAt: new Date(),
      rejectionReason: null,
    })
  }

  async reject(artifactId: string, rejectorId: string, reason: string): Promise<ArtifactEntity> {
    const artifact = await this.getArtifact(artifactId)

    // Validate artifact is pending approval
    if (artifact.approvalStatus !== 'PENDING_APPROVAL') {
      throw new ArtifactNotPendingApprovalError(artifactId, artifact.approvalStatus)
    }

    return this.repository.updateApprovalStatus(artifactId, {
      approvalStatus: 'REJECTED',
      approvedById: rejectorId,
      approvedAt: new Date(),
      rejectionReason: reason,
    })
  }

  private parseAttributes(rawAttributes: string): Record<string, string> {
    const attributes: Record<string, string> = {}

    for (const match of rawAttributes.matchAll(ATTRIBUTE_REGEX)) {
      attributes[match[1]] = match[2]
    }

    return attributes
  }

  private buildStorageKey(workflowId: string, key: string, version: number): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, '-')
    return `artifacts/${workflowId}/${sanitizedKey}/v${version}.md`
  }
}
