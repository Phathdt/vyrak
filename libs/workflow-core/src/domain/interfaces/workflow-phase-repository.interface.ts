import type { WorkflowPhaseEntity } from '../entities'
import type { TransactionContext } from './unit-of-work.interface'

export interface IWorkflowPhaseRepository {
  findById(id: string, tx?: TransactionContext): Promise<WorkflowPhaseEntity | null>
  findByWorkflowId(workflowId: string, tx?: TransactionContext): Promise<WorkflowPhaseEntity[]>
  create(workflowId: string, data: CreateWorkflowPhaseData, tx?: TransactionContext): Promise<WorkflowPhaseEntity>
  update(id: string, data: UpdateWorkflowPhaseData, tx?: TransactionContext): Promise<WorkflowPhaseEntity>
  updateStatus(id: string, status: string, tx?: TransactionContext): Promise<void>
  delete(id: string, tx?: TransactionContext): Promise<void>
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
