import { ArtifactNotFoundError } from '../../domain/exceptions/artifact.exceptions'

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
