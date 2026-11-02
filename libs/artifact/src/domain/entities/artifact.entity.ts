export const ArtifactType = {
  PRD: 'prd',
  ADR: 'adr',
  ARD: 'ard',
  IMPLEMENTATION_PLAN: 'implementation-plan',
} as const

export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType]

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
