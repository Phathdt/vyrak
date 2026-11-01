export declare const WorkflowApprovalStatus: {
  readonly PENDING: 'PENDING'
  readonly APPROVED: 'APPROVED'
  readonly REJECTED: 'REJECTED'
}
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
//# sourceMappingURL=workflow-approval.entity.d.ts.map
