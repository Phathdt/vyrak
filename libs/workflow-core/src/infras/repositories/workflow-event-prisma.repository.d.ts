import { BaseTenantRepository } from '@vyrak/database'

import type { WorkflowEventEntity, CreateWorkflowEventData, IWorkflowEventRepository } from '../../domain'
export declare class WorkflowEventPrismaRepository extends BaseTenantRepository implements IWorkflowEventRepository {
  private mapToEntity
  findById(id: string): Promise<WorkflowEventEntity | null>
  findByWorkflowId(workflowId: string, limit?: number): Promise<WorkflowEventEntity[]>
  findByPhaseId(phaseId: string, limit?: number): Promise<WorkflowEventEntity[]>
  findByEventType(workflowId: string, eventType: string): Promise<WorkflowEventEntity[]>
  create(workflowId: string, data: CreateWorkflowEventData): Promise<WorkflowEventEntity>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-event-prisma.repository.d.ts.map
