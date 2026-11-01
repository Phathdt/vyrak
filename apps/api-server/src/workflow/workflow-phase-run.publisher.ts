import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'

import type { IWorkflowPhaseRunPublisher, WorkflowPhaseRunJob } from '@vyrak/workflow-execution'

export const WORKFLOW_PHASE_RUN_QUEUE = 'workflow-execution'

export class BullWorkflowPhaseRunPublisher implements IWorkflowPhaseRunPublisher {
  constructor(@InjectQueue(WORKFLOW_PHASE_RUN_QUEUE) private readonly queue: Queue) {}

  async enqueuePhaseRun(job: WorkflowPhaseRunJob): Promise<void> {
    await this.queue.add('phase-run', job, {
      jobId: `${job.workflowId}:${job.phaseKey}:${Date.now()}`,
    })
  }
}
