import { WorkflowStatus, WorkflowType } from '../entities'

import type {
  CreateWorkflowDto,
  ListWorkflowsQueryDto,
  PaginatedWorkflows,
  UpdateWorkflowDto,
  WorkflowWithRepositories,
} from '../schemas'

export interface IWorkflowRepository {
  create(projectId: string, createdById: string, data: CreateWorkflowDto): Promise<WorkflowWithRepositories>

  findAll(projectId: string, query: ListWorkflowsQueryDto): Promise<PaginatedWorkflows>

  findOne(id: string): Promise<WorkflowWithRepositories | null>

  update(id: string, data: UpdateWorkflowDto): Promise<WorkflowWithRepositories>

  delete(id: string): Promise<void>

  updateStatus(id: string, status: WorkflowStatus): Promise<void>

  confirmClassification(id: string, type: WorkflowType, confirmedById: string): Promise<void>
}
