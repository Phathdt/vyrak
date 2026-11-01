import type { WorkflowWorkItemEntity } from '../entities'

export interface IWorkflowWorkItemRepository {
  findById(id: string): Promise<WorkflowWorkItemEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowWorkItemEntity[]>
  findByParentId(parentId: string): Promise<WorkflowWorkItemEntity[]>
  create(workflowId: string, data: CreateWorkflowWorkItemData): Promise<WorkflowWorkItemEntity>
  update(id: string, data: UpdateWorkflowWorkItemData): Promise<WorkflowWorkItemEntity>
  updateStatus(id: string, status: string): Promise<void>
  delete(id: string): Promise<void>
}

export interface CreateWorkflowWorkItemData {
  key: string
  type: string
  title: string
  description?: string | null
  parentId?: string | null
  acceptanceCriteria?: Record<string, unknown> | null
  priority?: string | null
  estimate?: Record<string, unknown> | null
  sequence?: number
  metadata?: Record<string, unknown> | null
}

export interface UpdateWorkflowWorkItemData {
  title?: string
  description?: string | null
  parentId?: string | null
  acceptanceCriteria?: Record<string, unknown> | null
  status?: string
  priority?: string | null
  estimate?: Record<string, unknown> | null
  sequence?: number
  metadata?: Record<string, unknown> | null
}
