import type { WorkflowPhaseEntity, WorkflowType } from '../entities'

export interface IWorkflowPhaseService {
  listByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]>
  initializePhasesForWorkflow(workflowId: string, workflowType: WorkflowType): Promise<WorkflowPhaseEntity[]>
}
