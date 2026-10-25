import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'
import { WorkflowExecutorService } from '@vyrak/workflow-core'

import { Job } from 'bullmq'

interface WorkflowJobData {
  runId: string
  organizationId: string
}

interface StepJobData {
  runId: string
  stepKey: string
  organizationId: string
}

/**
 * Workflow Execution Processor
 * Processes workflow execution jobs from BullMQ queue
 */
@Processor('workflow-execution')
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name)

  constructor(
    private readonly executor: WorkflowExecutorService,
    private readonly db: DatabaseService
  ) {
    super()
  }

  /**
   * Process workflow execution job
   * Sets tenant context, executes workflow, and ensures cleanup
   */
  async process(job: Job<WorkflowJobData | StepJobData>): Promise<void> {
    const { runId, organizationId } = job.data
    const jobName = job.name

    this.logger.log(`Processing job ${jobName} for run ${runId} (org: ${organizationId})`)

    try {
      // Set tenant context for multi-tenancy
      this.db.setTenantContext(organizationId)

      // Execute workflow run
      await this.executor.executeRun(runId)

      this.logger.log(`Job ${jobName} completed for run ${runId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      const stack = error instanceof Error ? error.stack : undefined

      this.logger.error(`Job ${jobName} failed for run ${runId}: ${message}`, stack)

      // Re-throw to let BullMQ handle retry logic
      throw error
    } finally {
      // Always clear tenant context to prevent leaks
      this.db.clearTenantContext()
    }
  }
}
