import { WorkflowRun } from '../entities/workflow-run.entity'
import { WorkflowState } from '../workflow-state'

/**
 * Parameters for creating a new workflow run
 */
export interface CreateRunParams {
  organizationId: string
  projectId: string
  workflowKey: string
  workflowVersion: string
  initiatedByUserId: string
  idempotencyKey?: string
  input?: Record<string, unknown>
}

/**
 * Workflow state update data
 */
export interface WorkflowStateUpdate {
  status: WorkflowState
  currentStepKey?: string
  errorCode?: string
  errorMessage?: string
  startedAt?: Date
  completedAt?: Date
}

/**
 * Repository interface for workflow operations
 */
export interface IWorkflowRepository {
  /**
   * Create a new workflow run
   * @throws WorkflowAlreadyExistsError if idempotency key already exists
   */
  createRun(params: CreateRunParams): Promise<WorkflowRun>

  /**
   * Find workflow run by ID
   * Returns null if not found
   */
  findRunById(runId: string): Promise<WorkflowRun | null>

  /**
   * Update workflow run state
   * @throws WorkflowNotFoundError if run not found
   */
  updateRunState(runId: string, state: WorkflowStateUpdate): Promise<void>

  /**
   * Find workflow run by idempotency key
   * Returns null if not found
   */
  findRunByIdempotencyKey(orgId: string, key: string): Promise<WorkflowRun | null>

  /**
   * Cancel a workflow run
   * @throws WorkflowNotFoundError if run not found
   */
  cancelRun(runId: string): Promise<void>
}
