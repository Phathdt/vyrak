import type { WorkflowEntity, WorkflowStatus, WorkflowType } from '../entities'
import type { TransactionContext } from './unit-of-work.interface'

export interface IWorkflowRepository {
  findById(id: string, tx?: TransactionContext): Promise<WorkflowEntity | null>
  findAll(projectId: string, filters: WorkflowFilters, tx?: TransactionContext): Promise<WorkflowEntity[]>
  count(projectId: string, filters: WorkflowFilters, tx?: TransactionContext): Promise<number>
  create(
    projectId: string,
    createdById: string,
    data: CreateWorkflowData,
    tx?: TransactionContext
  ): Promise<WorkflowEntity>
  update(id: string, data: UpdateWorkflowData, tx?: TransactionContext): Promise<WorkflowEntity>
  updateStatus(id: string, status: WorkflowStatus, tx?: TransactionContext): Promise<void>
  updateWorkflowType(id: string, type: WorkflowType, tx?: TransactionContext): Promise<void>
  updateDefinitionContext(
    id: string,
    data: { currentPhaseKey: string | null; definitionSnapshot: Record<string, unknown> },
    tx?: TransactionContext
  ): Promise<void>
  delete(id: string, tx?: TransactionContext): Promise<void>
}

export interface CreateWorkflowData {
  title: string
  description?: string | null
}

export interface UpdateWorkflowData {
  title?: string
  description?: string | null
}

export interface WorkflowFilters {
  search?: string
  type?: WorkflowType
  status?: WorkflowStatus
  createdById?: string
  sort?: 'title' | 'createdAt' | 'updatedAt' | 'startedAt'
  order?: 'asc' | 'desc'
  skip?: number
  take?: number
}
