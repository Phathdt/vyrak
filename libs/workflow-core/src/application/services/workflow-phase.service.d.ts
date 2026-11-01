import { WorkflowType } from '../../domain'

import type {
  AdvanceWorkflowPhaseResult,
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  WorkflowPhaseEntity,
} from '../../domain'
export declare class WorkflowPhaseService implements IWorkflowPhaseService {
  private readonly workflowRepository
  private readonly workflowPhaseRepository
  constructor(workflowRepository: IWorkflowRepository, workflowPhaseRepository: IWorkflowPhaseRepository)
  listByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]>
  initializePhasesForWorkflow(workflowId: string, workflowType: WorkflowType): Promise<WorkflowPhaseEntity[]>
  approveCurrentPhase(workflowId: string, approvedById: string, note?: string): Promise<AdvanceWorkflowPhaseResult>
  sendBackToPhase(workflowId: string, targetPhaseKey: string, reason?: string): Promise<AdvanceWorkflowPhaseResult>
  private completeCurrentPhaseAndAdvance
  private loadCurrentPhaseContext
}
//# sourceMappingURL=workflow-phase.service.d.ts.map
