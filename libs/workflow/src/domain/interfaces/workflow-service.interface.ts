import type { WorkflowEntity, WorkflowStatus, WorkflowType } from '../entities'

export interface IWorkflowService {
  create(
    organizationId: string,
    projectId: string,
    createdById: string,
    data: CreateWorkflowInput
  ): Promise<WorkflowWithRelations>

  findById(organizationId: string, id: string): Promise<WorkflowWithRelations | null>

  findAll(organizationId: string, projectId: string, query: ListWorkflowsQuery): Promise<PaginatedWorkflowsResult>

  update(organizationId: string, id: string, data: UpdateWorkflowInput): Promise<WorkflowEntity>

  delete(organizationId: string, id: string): Promise<void>

  startBrainstorming(organizationId: string, id: string): Promise<void>

  confirmClassification(organizationId: string, id: string, type: WorkflowType, confirmedById: string): Promise<void>
}

export interface CreateWorkflowInput {
  title: string
  description?: string | null
  repositoryIds: string[]
}

export interface UpdateWorkflowInput {
  title?: string
  description?: string | null
}

export interface ListWorkflowsQuery {
  page: number
  limit: number
  search?: string
  type?: WorkflowType
  status?: WorkflowStatus
  createdById?: string
  sort?: 'title' | 'createdAt' | 'updatedAt' | 'startedAt'
  order?: 'asc' | 'desc'
}

export interface WorkflowWithRelations extends WorkflowEntity {
  repositories: Array<{
    id: string
    repositoryId: string
  }>
}

export interface PaginatedWorkflowsResult {
  items: WorkflowWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}
