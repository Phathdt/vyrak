import { WorkflowType } from '../../domain'

import type {
  CreateWorkflowInput,
  IWorkflowPhaseService,
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
  IWorkflowService,
  ListWorkflowsQuery,
  PaginatedWorkflowsResult,
  UpdateWorkflowInput,
  WorkflowWithRelations,
} from '../../domain'
export declare class WorkflowService implements IWorkflowService {
  private readonly workflowRepository
  private readonly workflowRepositoryRepository
  private readonly workflowPhaseService
  constructor(
    workflowRepository: IWorkflowRepository,
    workflowRepositoryRepository: IWorkflowRepositoryRepository,
    workflowPhaseService: IWorkflowPhaseService
  )
  create(
    _organizationId: string,
    projectId: string,
    createdById: string,
    data: CreateWorkflowInput
  ): Promise<WorkflowWithRelations>
  findById(_organizationId: string, id: string): Promise<WorkflowWithRelations | null>
  findAll(_organizationId: string, projectId: string, query: ListWorkflowsQuery): Promise<PaginatedWorkflowsResult>
  update(_organizationId: string, id: string, data: UpdateWorkflowInput): Promise<import('../..').WorkflowEntity>
  delete(_organizationId: string, id: string): Promise<void>
  startBrainstorming(_organizationId: string, id: string): Promise<void>
  confirmClassification(_organizationId: string, id: string, _type: WorkflowType, confirmedById: string): Promise<void>
}
//# sourceMappingURL=workflow.service.d.ts.map
