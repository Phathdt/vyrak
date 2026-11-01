import type { WorkflowMessageEntity } from '../entities'

export interface IWorkflowMessageRepository {
  findById(id: string): Promise<WorkflowMessageEntity | null>
  findByWorkflowId(workflowId: string, limit?: number): Promise<WorkflowMessageEntity[]>
  findByPhaseId(phaseId: string, limit?: number): Promise<WorkflowMessageEntity[]>
  create(workflowId: string, data: CreateWorkflowMessageData): Promise<WorkflowMessageEntity>
  delete(id: string): Promise<void>
}

export interface CreateWorkflowMessageData {
  phaseId?: string | null
  agentExecutionId?: string | null
  role: string
  content: string
  metadata?: Record<string, unknown> | null
  createdById?: string | null
}
