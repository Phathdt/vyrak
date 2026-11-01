import { BaseTenantRepository } from '@vyrak/database'

import type {
  WorkflowWorkItemEntity,
  CreateWorkflowWorkItemData,
  IWorkflowWorkItemRepository,
  UpdateWorkflowWorkItemData,
} from '../../domain'
export declare class WorkflowWorkItemPrismaRepository
  extends BaseTenantRepository
  implements IWorkflowWorkItemRepository
{
  private mapToEntity
  findById(id: string): Promise<WorkflowWorkItemEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowWorkItemEntity[]>
  findByParentId(parentId: string): Promise<WorkflowWorkItemEntity[]>
  create(workflowId: string, data: CreateWorkflowWorkItemData): Promise<WorkflowWorkItemEntity>
  update(id: string, data: UpdateWorkflowWorkItemData): Promise<WorkflowWorkItemEntity>
  updateStatus(id: string, status: string): Promise<void>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-work-item-prisma.repository.d.ts.map
