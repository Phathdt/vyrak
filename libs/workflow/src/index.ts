// Module
export { WorkflowModule } from './workflow.module'

// Services
export type { IWorkflowService } from './domain/interfaces/workflow-service.interface'
export type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ListWorkflowsQuery,
  WorkflowWithRelations,
  PaginatedWorkflowsResult,
} from './domain/interfaces/workflow-service.interface'

// Repositories
export type { IWorkflowRepository } from './domain/interfaces/workflow-repository.interface'
export type { IWorkflowRepositoryRepository } from './domain/interfaces/workflow-repository-repository.interface'
export type { IWorkflowPhaseRepository } from './domain/interfaces/workflow-phase-repository.interface'

// Entities - Values
export { WorkflowType, WorkflowStatus } from './domain/entities/workflow.entity'
export { WorkflowPhaseStatus } from './domain/entities/workflow-phase.entity'

// Entities - Types
export type {
  WorkflowEntity,
  WorkflowType as WorkflowTypeEnum,
  WorkflowStatus as WorkflowStatusEnum,
} from './domain/entities/workflow.entity'
export type {
  WorkflowPhaseEntity,
  WorkflowPhaseStatus as WorkflowPhaseStatusEnum,
} from './domain/entities/workflow-phase.entity'
export type { WorkflowRepositoryEntity } from './domain/entities/workflow-repository.entity'

// DTOs (reuse from old schemas for now)
export {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ListWorkflowsQueryDto,
  ClassifyWorkflowDto,
  ConfirmClassificationDto,
  WorkflowResponse,
} from './domain/schemas/workflow.schemas'

// DI Tokens
export { WORKFLOW_SERVICE, WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY } from './infras/di/di'
