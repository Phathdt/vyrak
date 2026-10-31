import type { WorkflowApprovalEntity } from '../entities'

export interface IWorkflowApprovalRepository {
  findById(id: string): Promise<WorkflowApprovalEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowApprovalEntity[]>
  findPendingByWorkflowId(workflowId: string): Promise<WorkflowApprovalEntity[]>
  create(workflowId: string, proposalArtifactId: string, requestedById: string): Promise<WorkflowApprovalEntity>
  updateStatus(
    id: string,
    status: string,
    decidedById: string,
    decisionNote?: string | null
  ): Promise<WorkflowApprovalEntity>
  delete(id: string): Promise<void>
}
