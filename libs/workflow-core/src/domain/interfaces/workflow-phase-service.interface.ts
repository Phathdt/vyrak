import type { WorkflowPhaseEntity, WorkflowType } from '../entities'

export type AdvanceWorkflowPhaseResult = {
  previousPhaseKey: string
  currentPhaseKey: string | null
  workflowCompleted: boolean
  phases: WorkflowPhaseEntity[]
}

export interface IWorkflowPhaseService {
  listByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]>
  initializePhasesForWorkflow(workflowId: string, workflowType: WorkflowType): Promise<WorkflowPhaseEntity[]>
  /** Human confirms in UI; completes current phase and advances (no separate submit step). */
  approveCurrentPhase(workflowId: string, approvedById: string, note?: string): Promise<AdvanceWorkflowPhaseResult>
  sendBackToPhase(workflowId: string, targetPhaseKey: string, reason?: string): Promise<AdvanceWorkflowPhaseResult>
}
