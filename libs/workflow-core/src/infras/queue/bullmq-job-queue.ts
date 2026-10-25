import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'

import { Queue } from 'bullmq'

import { QueueException, ValidationException } from '../../domain/errors/common.error'
import type { IJobQueue, JobOptions } from '../../domain/interfaces/job-queue.interface'
import type { WorkflowJobData } from '../../domain/interfaces/workflow-job-data.interface'

/**
 * BullMQ implementation of job queue for workflow execution
 * Handles reliable job dispatch to background workers with Redis persistence
 */
@Injectable()
export class BullMQJobQueue implements IJobQueue {
  private readonly logger = new Logger(BullMQJobQueue.name)

  constructor(
    @InjectQueue('workflow-execution')
    private readonly queue: Queue<WorkflowJobData>
  ) {}

  /**
   * Enqueue a workflow run for initial execution
   */
  async enqueueWorkflowJob(runId: string, organizationId: string, options?: JobOptions): Promise<void> {
    try {
      const jobData: WorkflowJobData = {
        runId,
        organizationId,
        attempt: options?.attempts ?? 0,
      }

      const job = await this.queue.add('execute-workflow', jobData, {
        jobId: options?.jobId ?? `workflow-${runId}`,
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts ?? 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      })

      this.logger.log({
        message: 'Workflow job enqueued',
        jobId: job.id,
        runId,
        organizationId,
      })
    } catch (error) {
      this.logger.error({
        message: 'Failed to enqueue workflow job',
        runId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new QueueException(
        `Failed to enqueue workflow job for runId ${runId}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Enqueue a specific step of a workflow run
   */
  async enqueueStepJob(runId: string, stepKey: string, organizationId: string, options?: JobOptions): Promise<void> {
    try {
      // Validate step key format
      if (!stepKey || typeof stepKey !== 'string' || stepKey.trim().length === 0) {
        throw new ValidationException('Step key must be a non-empty string')
      }

      const jobData: WorkflowJobData = {
        runId,
        organizationId,
        stepKey,
        attempt: options?.attempts ?? 0,
      }

      const job = await this.queue.add('execute-step', jobData, {
        jobId: options?.jobId ?? `step-${runId}-${stepKey}`,
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts ?? 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      })

      this.logger.log({
        message: 'Step job enqueued',
        jobId: job.id,
        runId,
        stepKey,
        organizationId,
      })
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error
      }

      this.logger.error({
        message: 'Failed to enqueue step job',
        runId,
        stepKey,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new QueueException(
        `Failed to enqueue step job for runId ${runId}, stepKey ${stepKey}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
