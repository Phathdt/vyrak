import type { WorkflowEntity, WorkflowStatus, WorkflowType } from '../entities'

export interface IWorkflowRepository {
  findById(id: string): Promise<WorkflowEntity | null>
  findAll(projectId: string, filters: WorkflowFilters): Promise<WorkflowEntity[]>
  count(projectId: string, filters: WorkflowFilters): Promise<number>
  create(projectId: string, createdById: string, data: CreateWorkflowData): Promise<WorkflowEntity>
  update(id: string, data: UpdateWorkflowData): Promise<WorkflowEntity>
  updateStatus(id: string, status: WorkflowStatus): Promise<void>
  updateType(id: string, type: WorkflowType, confirmedById: string): Promise<void>
  delete(id: string): Promise<void>
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
