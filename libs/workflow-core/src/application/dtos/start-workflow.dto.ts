/**
 * Input DTO for starting a workflow run
 */
export interface StartWorkflowInput {
  /**
   * Organization ID that owns the workflow
   */
  organizationId: string

  /**
   * Project ID where the workflow is defined
   */
  projectId: string

  /**
   * Unique key identifying the workflow
   */
  workflowKey: string

  /**
   * Semantic version of the workflow to execute
   */
  workflowVersion: string

  /**
   * User ID who initiated the workflow run
   */
  initiatedByUserId: string

  /**
   * Optional idempotency key to prevent duplicate runs
   * If provided and a run with this key exists, returns existing run
   */
  idempotencyKey?: string

  /**
   * Optional input data for the workflow execution
   */
  input?: Record<string, unknown>
}
