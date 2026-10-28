import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BullMQJobQueue, QueueException, ValidationException } from './bullmq-job-queue'

import type { WorkflowJobData } from '../../domain'
import type { Queue } from 'bullmq'

describe('BullMQJobQueue', () => {
  let jobQueue: BullMQJobQueue
  let mockQueue: Queue<WorkflowJobData>

  beforeEach(() => {
    // Create mock BullMQ queue
    mockQueue = {
      add: vi.fn(),
    } as unknown as Queue<WorkflowJobData>

    // Create instance with mocked queue
    jobQueue = new BullMQJobQueue(mockQueue)
  })

  describe('enqueueWorkflowJob', () => {
    it('should enqueue workflow job with correct payload', async () => {
      const runId = 'run-123'
      const organizationId = 'org-456'

      const mockJob = { id: 'job-1' }
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as any)

      await jobQueue.enqueueWorkflowJob(runId, organizationId)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-workflow',
        {
          runId,
          organizationId,
          attempt: 0,
        },
        expect.objectContaining({
          jobId: `workflow-${runId}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        })
      )
    })

    it('should include organizationId for tenant isolation', async () => {
      const runId = 'run-123'
      const organizationId = 'org-789'

      const mockJob = { id: 'job-2' }
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as any)

      await jobQueue.enqueueWorkflowJob(runId, organizationId)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-workflow',
        expect.objectContaining({
          organizationId: 'org-789',
        }),
        expect.any(Object)
      )
    })

    it('should respect custom job options', async () => {
      const runId = 'run-123'
      const organizationId = 'org-456'
      const options = {
        priority: 10,
        delay: 5000,
        attempts: 5,
        jobId: 'custom-job-id',
      }

      const mockJob = { id: 'job-3' }
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as any)

      await jobQueue.enqueueWorkflowJob(runId, organizationId, options)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-workflow',
        expect.objectContaining({
          runId,
          organizationId,
          attempt: 5,
        }),
        expect.objectContaining({
          jobId: 'custom-job-id',
          priority: 10,
          delay: 5000,
          attempts: 5,
        })
      )
    })

    it('should throw QueueException when queue fails', async () => {
      const runId = 'run-123'
      const organizationId = 'org-456'

      vi.mocked(mockQueue.add).mockRejectedValue(new Error('Redis connection failed'))

      await expect(jobQueue.enqueueWorkflowJob(runId, organizationId)).rejects.toThrow(QueueException)
      await expect(jobQueue.enqueueWorkflowJob(runId, organizationId)).rejects.toThrow(/Failed to enqueue workflow job/)
    })
  })

  describe('enqueueStepJob', () => {
    it('should enqueue step job with stepKey in payload', async () => {
      const runId = 'run-123'
      const stepKey = 'step-1'
      const organizationId = 'org-456'

      const mockJob = { id: 'job-4' }
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as any)

      await jobQueue.enqueueStepJob(runId, stepKey, organizationId)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-step',
        {
          runId,
          organizationId,
          stepKey,
          attempt: 0,
        },
        expect.objectContaining({
          jobId: `step-${runId}-${stepKey}`,
          attempts: 3,
        })
      )
    })

    it('should validate stepKey is non-empty', async () => {
      const runId = 'run-123'
      const organizationId = 'org-456'

      await expect(jobQueue.enqueueStepJob(runId, '', organizationId)).rejects.toThrow(ValidationException)
      await expect(jobQueue.enqueueStepJob(runId, '  ', organizationId)).rejects.toThrow(ValidationException)
    })

    it('should include organizationId for tenant context', async () => {
      const runId = 'run-123'
      const stepKey = 'step-2'
      const organizationId = 'org-999'

      const mockJob = { id: 'job-5' }
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as any)

      await jobQueue.enqueueStepJob(runId, stepKey, organizationId)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-step',
        expect.objectContaining({
          organizationId: 'org-999',
        }),
        expect.any(Object)
      )
    })

    it('should respect custom job options for step jobs', async () => {
      const runId = 'run-123'
      const stepKey = 'step-3'
      const organizationId = 'org-456'
      const options = {
        priority: 5,
        delay: 1000,
        jobId: 'custom-step-job',
      }

      const mockJob = { id: 'job-6' }
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as any)

      await jobQueue.enqueueStepJob(runId, stepKey, organizationId, options)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-step',
        expect.any(Object),
        expect.objectContaining({
          jobId: 'custom-step-job',
          priority: 5,
          delay: 1000,
        })
      )
    })

    it('should throw QueueException when queue unavailable', async () => {
      const runId = 'run-123'
      const stepKey = 'step-4'
      const organizationId = 'org-456'

      vi.mocked(mockQueue.add).mockRejectedValue(new Error('Connection timeout'))

      await expect(jobQueue.enqueueStepJob(runId, stepKey, organizationId)).rejects.toThrow(QueueException)
    })
  })

  describe('error handling', () => {
    it('should preserve ValidationException without wrapping', async () => {
      const runId = 'run-123'
      const organizationId = 'org-456'

      await expect(jobQueue.enqueueStepJob(runId, '', organizationId)).rejects.toThrow(ValidationException)
    })

    it('should wrap queue errors in QueueException', async () => {
      const runId = 'run-123'
      const organizationId = 'org-456'

      vi.mocked(mockQueue.add).mockRejectedValue(new Error('Network error'))

      await expect(jobQueue.enqueueWorkflowJob(runId, organizationId)).rejects.toThrow(QueueException)
      await expect(jobQueue.enqueueWorkflowJob(runId, organizationId)).rejects.toThrow(/Network error/)
    })
  })
})
