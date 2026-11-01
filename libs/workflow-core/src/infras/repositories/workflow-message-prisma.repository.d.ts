import { BaseTenantRepository } from '@vyrak/database'

import type { WorkflowMessageEntity, CreateWorkflowMessageData, IWorkflowMessageRepository } from '../../domain'
export declare class WorkflowMessagePrismaRepository
  extends BaseTenantRepository
  implements IWorkflowMessageRepository
{
  private mapToEntity
  findById(id: string): Promise<WorkflowMessageEntity | null>
  findByWorkflowId(workflowId: string, limit?: number): Promise<WorkflowMessageEntity[]>
  findByPhaseId(phaseId: string, limit?: number): Promise<WorkflowMessageEntity[]>
  create(workflowId: string, data: CreateWorkflowMessageData): Promise<WorkflowMessageEntity>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-message-prisma.repository.d.ts.map
