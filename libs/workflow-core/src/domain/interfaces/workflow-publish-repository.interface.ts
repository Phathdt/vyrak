import type { WorkflowPublishEntity } from '../entities'

export interface IWorkflowPublishRepository {
  findById(id: string): Promise<WorkflowPublishEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowPublishEntity[]>
  findByIdempotencyKey(idempotencyKey: string): Promise<WorkflowPublishEntity | null>
  create(workflowId: string, data: CreateWorkflowPublishData): Promise<WorkflowPublishEntity>
  updateStatus(id: string, status: string, error?: string | null): Promise<WorkflowPublishEntity>
  incrementAttempts(id: string): Promise<void>
  delete(id: string): Promise<void>
}

export interface CreateWorkflowPublishData {
  connectionId: string
  approvalId: string
  idempotencyKey: string
}
