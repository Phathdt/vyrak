import type { WorkflowType } from '../entities'
import type {
  CreateWorkflowDto,
  ListWorkflowsQueryDto,
  PaginatedWorkflows,
  UpdateWorkflowDto,
  WorkflowWithRepositories,
} from '../schemas'

export interface IWorkflowService {
  create(
    organizationId: string,
    projectId: string,
    createdById: string,
    data: CreateWorkflowDto
  ): Promise<WorkflowWithRepositories>

  findAll(organizationId: string, projectId: string, query: ListWorkflowsQueryDto): Promise<PaginatedWorkflows>

  findOne(organizationId: string, id: string): Promise<WorkflowWithRepositories>

  update(organizationId: string, id: string, data: UpdateWorkflowDto): Promise<WorkflowWithRepositories>

  delete(organizationId: string, id: string): Promise<void>

  startBrainstorming(organizationId: string, id: string): Promise<void>

  confirmClassification(organizationId: string, id: string, type: WorkflowType, confirmedById: string): Promise<void>
}
