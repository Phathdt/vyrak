export const WorkflowApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type WorkflowApprovalStatus = (typeof WorkflowApprovalStatus)[keyof typeof WorkflowApprovalStatus]

export interface WorkflowApprovalEntity {
  id: string
  organizationId: string
  workflowId: string
  proposalArtifactId: string
  status: WorkflowApprovalStatus
  requestedById: string
  decidedById: string | null
  decisionNote: string | null
  requestedAt: Date
  decidedAt: Date | null
}
