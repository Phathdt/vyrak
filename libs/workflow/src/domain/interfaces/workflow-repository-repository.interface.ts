import type { WorkflowRepositoryEntity } from '../entities'

export interface IWorkflowRepositoryRepository {
  findByWorkflowId(workflowId: string): Promise<WorkflowRepositoryEntity[]>
  create(workflowId: string, repositoryId: string): Promise<WorkflowRepositoryEntity>
  createMany(workflowId: string, repositoryIds: string[]): Promise<void>
  delete(id: string): Promise<void>
  deleteByWorkflowId(workflowId: string): Promise<void>
}
