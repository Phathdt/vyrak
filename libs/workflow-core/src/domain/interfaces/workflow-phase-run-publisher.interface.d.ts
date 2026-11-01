import type { WorkflowPhaseRunJob } from '../schemas/phase-execution.schemas'
export interface IWorkflowPhaseRunPublisher {
  enqueuePhaseRun(job: WorkflowPhaseRunJob): Promise<void>
}
//# sourceMappingURL=workflow-phase-run-publisher.interface.d.ts.map
