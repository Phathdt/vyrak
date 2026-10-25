/**
 * Job options for queue operations
 */
export interface JobOptions {
  /**
   * Job priority (higher number = higher priority)
   */
  priority?: number

  /**
   * Delay in milliseconds before job is processed
   */
  delay?: number

  /**
   * Maximum number of retry attempts
   */
  attempts?: number

  /**
   * Custom job ID for idempotency
   */
  jobId?: string
}

/**
 * Job queue interface for workflow execution
 * Provides methods to enqueue workflow and step jobs for background processing
 */
export interface IJobQueue {
  /**
   * Enqueue a workflow run for initial execution
   * @param runId - The workflow run identifier
   * @param organizationId - Organization/tenant identifier for isolation
   * @param options - Optional job configuration
   */
  enqueueWorkflowJob(runId: string, organizationId: string, options?: JobOptions): Promise<void>

  /**
   * Enqueue a specific step of a workflow run
   * @param runId - The workflow run identifier
   * @param stepKey - The step identifier within the workflow
   * @param organizationId - Organization/tenant identifier for isolation
   * @param options - Optional job configuration
   */
  enqueueStepJob(runId: string, stepKey: string, organizationId: string, options?: JobOptions): Promise<void>
}
