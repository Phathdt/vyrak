import { BaseTenantRepository } from '@vyrak/database'

import type { IWorkflowApprovalRepository, WorkflowApprovalEntity } from '../../domain'
export declare class WorkflowApprovalPrismaRepository
  extends BaseTenantRepository
  implements IWorkflowApprovalRepository
{
  private mapToEntity
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
//# sourceMappingURL=workflow-approval-prisma.repository.d.ts.map
