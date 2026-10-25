import { WorkflowApproval } from '../entities/workflow-approval.entity'

/**
 * Repository interface for workflow approval operations
 */
export interface IWorkflowApprovalRepository {
  /**
   * Save (create or update) a workflow approval
   */
  save(approval: WorkflowApproval): Promise<void>

  /**
   * Find approval by ID
   * Returns null if not found
   */
  findById(id: string): Promise<WorkflowApproval | null>

  /**
   * Find approval by workflow run ID
   * Returns null if not found
   */
  findByRunId(runId: string): Promise<WorkflowApproval | null>

  /**
   * Find pending approval by workflow run ID
   * Returns null if not found or not pending
   */
  findPendingByRunId(runId: string): Promise<WorkflowApproval | null>
}
