import type { WorkflowPhaseEntity } from '../entities'

export interface IWorkflowPhaseRepository {
  findById(id: string): Promise<WorkflowPhaseEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]>
  create(workflowId: string, data: CreateWorkflowPhaseData): Promise<WorkflowPhaseEntity>
  update(id: string, data: UpdateWorkflowPhaseData): Promise<WorkflowPhaseEntity>
  updateStatus(id: string, status: string): Promise<void>
  delete(id: string): Promise<void>
}

export interface CreateWorkflowPhaseData {
  key: string
  name: string
  sequence: number
  config?: Record<string, unknown> | null
}

export interface UpdateWorkflowPhaseData {
  name?: string
  sequence?: number
  config?: Record<string, unknown> | null
  input?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
  error?: Record<string, unknown> | null
  startedAt?: Date | null
  completedAt?: Date | null
}
