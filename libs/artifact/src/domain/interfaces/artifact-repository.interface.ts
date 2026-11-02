import type { ArtifactApprovalStatus, ArtifactEntity } from '../entities'

export interface ArtifactFilters {
  type?: string
  key?: string
  approvalStatus?: ArtifactApprovalStatus
}

export interface CreateArtifactInput {
  workflowId: string
  phaseId: string | null
  agentExecutionId: string | null
  key: string
  type: string
  title: string
  fileName: string | null
  s3Bucket: string
  s3Key: string
  mimeType: string | null
  contentSize: number | null
  checksum: string | null
  version: number
  metadata: Record<string, unknown> | null
}

export interface UpdateArtifactApprovalInput {
  approvalStatus: ArtifactApprovalStatus
  approvedById?: string | null
  approvedAt?: Date | null
  rejectionReason?: string | null
}

export interface IArtifactRepository {
  create(input: CreateArtifactInput): Promise<ArtifactEntity>
  findById(id: string): Promise<ArtifactEntity | null>
  findByWorkflow(workflowId: string, filters?: ArtifactFilters): Promise<ArtifactEntity[]>
  findByPhase(phaseId: string): Promise<ArtifactEntity[]>
  findByType(workflowId: string, type: string): Promise<ArtifactEntity[]>
  findByKey(workflowId: string, key: string): Promise<ArtifactEntity | null>
  findLatestVersion(workflowId: string, key: string): Promise<ArtifactEntity | null>
  updateApprovalStatus(id: string, input: UpdateArtifactApprovalInput): Promise<ArtifactEntity>
}
