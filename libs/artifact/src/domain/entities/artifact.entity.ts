export const ArtifactType = {
  PRD: 'prd',
  ADR: 'adr',
  ARD: 'ard',
  IMPLEMENTATION_PLAN: 'implementation-plan',
} as const

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType]

export const ArtifactApprovalStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type ArtifactApprovalStatus = (typeof ArtifactApprovalStatus)[keyof typeof ArtifactApprovalStatus]

export interface ArtifactEntity {
  id: string
  organizationId: string
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
  approvalStatus: ArtifactApprovalStatus
  approvedById: string | null
  approvedAt: Date | null
  rejectionReason: string | null
  supersededBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ParsedArtifact {
  type: string
  key: string
  title: string
  format: string
  content: string
}
