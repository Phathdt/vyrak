import type { WorkflowDependencyEntity } from '../entities'

export interface IWorkflowDependencyRepository {
  findByWorkflowId(workflowId: string): Promise<WorkflowDependencyEntity[]>
  findByDependentItemId(dependentItemId: string): Promise<WorkflowDependencyEntity[]>
  findByDependsOnItemId(dependsOnItemId: string): Promise<WorkflowDependencyEntity[]>
  create(
    workflowId: string,
    dependentItemId: string,
    dependsOnItemId: string,
    type?: string
  ): Promise<WorkflowDependencyEntity>
  delete(id: string): Promise<void>
}
