import type { ArtifactEntity, ArtifactType, ParsedArtifact } from '../entities'
import type { ArtifactFilters } from './artifact-repository.interface'

export interface UploadArtifactOptions {
  phaseId?: string | null
  agentExecutionId?: string | null
  fileName?: string | null
  mimeType?: string | null
  metadata?: Record<string, unknown> | null
}

export interface ArtifactWithContent {
  artifact: ArtifactEntity
  content: string
}

export interface IArtifactService {
  uploadArtifact(
    workflowId: string,
    type: ArtifactType | string,
    key: string,
    title: string,
    content: string,
    options?: UploadArtifactOptions
  ): Promise<ArtifactEntity>
  getArtifact(id: string): Promise<ArtifactEntity>
  downloadArtifact(id: string): Promise<ArtifactWithContent>
  listWorkflowArtifacts(workflowId: string, filters?: ArtifactFilters): Promise<ArtifactEntity[]>
  listPhaseArtifacts(phaseId: string): Promise<ArtifactEntity[]>
  parseArtifactTags(aiResponse: string): ParsedArtifact[]
  requestApproval(artifactId: string, requesterId: string): Promise<ArtifactEntity>
  approve(artifactId: string, approverId: string): Promise<ArtifactEntity>
  reject(artifactId: string, rejectorId: string, reason: string): Promise<ArtifactEntity>
}
