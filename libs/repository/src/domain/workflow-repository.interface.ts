/**
 * Workflow-Repository link entity (many-to-many relationship)
 */
export interface WorkflowRepository {
  workflowId: string
  repositoryId: string
}

/**
 * Repository for querying workflow-repository links
 */
export interface IWorkflowRepositoryRepository {
  findByWorkflowId(workflowId: string): Promise<WorkflowRepository[]>
}
