import type { SubTaskEntity, SubTaskStatus } from '../entities/subtask.entity'

export interface ISubTaskRepository {
  findById(id: string): Promise<SubTaskEntity | null>
  findByWorkflowId(workflowId: string): Promise<SubTaskEntity[]>
  findByPhaseId(phaseId: string): Promise<SubTaskEntity[]>
  findByStatus(workflowId: string, status: SubTaskStatus): Promise<SubTaskEntity[]>
  findReadyTasks(workflowId: string): Promise<SubTaskEntity[]>
  findDependencies(taskId: string): Promise<string[]>
  create(workflowId: string, data: CreateSubTaskData): Promise<SubTaskEntity>
  update(id: string, data: UpdateSubTaskData): Promise<SubTaskEntity>
  updateStatus(id: string, status: SubTaskStatus): Promise<void>
  delete(id: string): Promise<void>
}

export interface CreateSubTaskData {
  phaseId?: string | null
  key: string
  type: string
  title: string
  description?: string | null
  parentId?: string | null
  acceptanceCriteria?: Record<string, unknown> | null
  dependencyType?: string
  executionOrder?: number
  assignedAgentRole?: string | null
  priority?: string | null
  estimate?: Record<string, unknown> | null
  sequence?: number
  metadata?: Record<string, unknown> | null
}

export interface UpdateSubTaskData {
  phaseId?: string | null
  title?: string
  description?: string | null
  status?: SubTaskStatus
  dependencyType?: string
  executionOrder?: number
  assignedAgentRole?: string | null
  priority?: string | null
  estimate?: Record<string, unknown> | null
  sequence?: number
  metadata?: Record<string, unknown> | null
}
