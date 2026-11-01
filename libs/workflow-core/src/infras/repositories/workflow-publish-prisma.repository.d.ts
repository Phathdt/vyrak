import { BaseTenantRepository } from '@vyrak/database'

import type { WorkflowPublishEntity, CreateWorkflowPublishData, IWorkflowPublishRepository } from '../../domain'
export declare class WorkflowPublishPrismaRepository
  extends BaseTenantRepository
  implements IWorkflowPublishRepository
{
  private mapToEntity
  findById(id: string): Promise<WorkflowPublishEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowPublishEntity[]>
  findByIdempotencyKey(idempotencyKey: string): Promise<WorkflowPublishEntity | null>
  create(workflowId: string, data: CreateWorkflowPublishData): Promise<WorkflowPublishEntity>
  updateStatus(id: string, status: string, error?: string | null): Promise<WorkflowPublishEntity>
  incrementAttempts(id: string): Promise<void>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-publish-prisma.repository.d.ts.map
