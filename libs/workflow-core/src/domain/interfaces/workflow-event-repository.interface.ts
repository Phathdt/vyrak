import type { WorkflowEventEntity } from '../entities'

export interface IWorkflowEventRepository {
  findById(id: string): Promise<WorkflowEventEntity | null>
  findByWorkflowId(workflowId: string, limit?: number): Promise<WorkflowEventEntity[]>
  findByPhaseId(phaseId: string, limit?: number): Promise<WorkflowEventEntity[]>
  findByEventType(workflowId: string, eventType: string): Promise<WorkflowEventEntity[]>
  create(workflowId: string, data: CreateWorkflowEventData): Promise<WorkflowEventEntity>
  delete(id: string): Promise<void>
}

export interface CreateWorkflowEventData {
  phaseId?: string | null
  eventType: string
  actorType?: string | null
  actorId?: string | null
  payload?: Record<string, unknown> | null
}
