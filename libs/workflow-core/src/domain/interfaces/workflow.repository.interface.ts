import { WorkflowRun } from '../entities'
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

  /**
   * Acquire lease for workflow run execution
   * Returns true if lease acquired successfully
   * Atomic operation: only acquires if no active lease exists or lease expired
   */
  acquireLease(runId: string, workerId: string, leaseDurationMs: number): Promise<boolean>

  /**
   * Renew existing lease
   * Returns true if renewed successfully (only if current owner)
   */
  renewLease(runId: string, workerId: string, leaseDurationMs: number): Promise<boolean>

  /**
   * Release lease
   * Only releases if current owner
   */
  releaseLease(runId: string, workerId: string): Promise<void>

  /**
   * Update heartbeat timestamp
   * Only updates if current owner
   */
  updateHeartbeat(runId: string, workerId: string): Promise<void>

  /**
   * Find workflow runs with expired leases
   * Used for recovery mechanisms
   */
  findExpiredLeases(limit?: number): Promise<string[]>
}
