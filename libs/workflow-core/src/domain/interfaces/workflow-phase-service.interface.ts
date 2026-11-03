import type { WorkflowPhaseEntity } from '../entities'

export type AdvanceWorkflowPhaseResult = {
  previousPhaseKey: string
  currentPhaseKey: string | null
  workflowCompleted: boolean
  phases: WorkflowPhaseEntity[]
}

export type ApprovePhaseResult = AdvanceWorkflowPhaseResult & {
  completedPhase: WorkflowPhaseEntity
}

export interface IWorkflowPhaseService {
  listByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]>
  create(workflowId: string, data: { name: string; key: string; sequence: number }): Promise<WorkflowPhaseEntity>
  /** Approves the phase identified by phaseId, which must be the workflow's current phase. */
  approvePhase(workflowId: string, phaseId: string, approvedById: string, note?: string): Promise<ApprovePhaseResult>
  /** Human confirms in UI; completes current phase and advances (no separate submit step). */
  approveCurrentPhase(workflowId: string, approvedById: string, note?: string): Promise<AdvanceWorkflowPhaseResult>
  sendBackToPhase(workflowId: string, targetPhaseKey: string, reason?: string): Promise<AdvanceWorkflowPhaseResult>
}
