/**
 * Job data payload for workflow execution jobs
 * Contains all necessary context for processing workflow runs and steps
 */
export interface WorkflowJobData {
  /**
   * Workflow run identifier
   */
  runId: string

  /**
   * Organization/tenant identifier for multi-tenancy isolation
   */
  organizationId: string

  /**
   * Optional step key for step-specific jobs
   * If omitted, processes the entire workflow run
   */
  stepKey?: string

  /**
   * Attempt counter for retry tracking
   * Incremented by retry handler on failures
   */
  attempt?: number

  /**
   * Scheduled execution time for delayed jobs
   */
  scheduledAt?: Date
}
