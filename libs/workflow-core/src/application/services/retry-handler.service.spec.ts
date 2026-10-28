import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StepStatus } from '../../domain/step-types'
import { RetryableError, RetryHandler } from './retry-handler.service'

import type { IEventRepository, IJobQueue, IStepRepository } from '../../domain/interfaces'
import type { RetryPolicy } from '../../domain/step-contracts'
import type { StepDefinition } from './workflow-definition'

describe('RetryHandler', () => {
  let handler: RetryHandler
  let stepRepo: IStepRepository
  let eventRepo: IEventRepository
  let jobQueue: IJobQueue

  beforeEach(() => {
    stepRepo = {
      findById: vi.fn(),
      incrementAttempt: vi.fn(),
      createStepRun: vi.fn(),
      findStepsByRunId: vi.fn(),
      updateStepStatus: vi.fn(),
    }

    eventRepo = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
      findEventsByStepRunId: vi.fn(),
    }

    jobQueue = {
      enqueueWorkflowJob: vi.fn(),
      enqueueStepJob: vi.fn(),
    }

    handler = new RetryHandler(stepRepo, eventRepo, jobQueue)
  })

  describe('shouldRetry', () => {
    it('should return false if max attempts exceeded', () => {
      const error: RetryableError = { code: 'TIMEOUT', message: 'timeout' }
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: ['TIMEOUT'],
      }

      expect(handler.shouldRetry(error, 3, policy)).toBe(false)
    })

    it('should return false if attempt equals max attempts', () => {
      const error: WorkflowError = { code: 'TIMEOUT', message: 'timeout' }
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: ['TIMEOUT'],
      }

      expect(handler.shouldRetry(error, 3, policy)).toBe(false)
    })

    it('should return true for retryable error within max attempts', () => {
      const error: WorkflowError = { code: 'TIMEOUT', message: 'timeout' }
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: ['TIMEOUT'],
      }

      expect(handler.shouldRetry(error, 1, policy)).toBe(true)
      expect(handler.shouldRetry(error, 2, policy)).toBe(true)
    })

    it('should return false for non-retryable error', () => {
      const error: RetryableError = { code: 'VALIDATION_ERROR', message: 'invalid' }
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: ['TIMEOUT'],
      }

      expect(handler.shouldRetry(error, 1, policy)).toBe(false)
    })

    it('should use default transient errors when retryableErrorCodes is empty', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: [],
      }

      // Transient errors should be retryable
      expect(handler.shouldRetry({ code: 'TIMEOUT', message: 'timeout' }, 1, policy)).toBe(true)
      expect(handler.shouldRetry({ code: 'NETWORK_ERROR', message: 'network' }, 1, policy)).toBe(true)
      expect(handler.shouldRetry({ code: 'SERVICE_UNAVAILABLE', message: 'unavailable' }, 1, policy)).toBe(true)
      expect(handler.shouldRetry({ code: 'RATE_LIMIT', message: 'rate limit' }, 1, policy)).toBe(true)

      // Non-transient errors should not be retryable
      expect(handler.shouldRetry({ code: 'VALIDATION_ERROR', message: 'invalid' }, 1, policy)).toBe(false)
      expect(handler.shouldRetry({ code: 'AUTHORIZATION_ERROR', message: 'unauthorized' }, 1, policy)).toBe(false)
      expect(handler.shouldRetry({ code: 'NOT_FOUND', message: 'not found' }, 1, policy)).toBe(false)
    })

    it('should handle multiple retryable error codes', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT'],
      }

      expect(handler.shouldRetry({ code: 'TIMEOUT', message: 'timeout' }, 1, policy)).toBe(true)
      expect(handler.shouldRetry({ code: 'NETWORK_ERROR', message: 'network' }, 1, policy)).toBe(true)
      expect(handler.shouldRetry({ code: 'RATE_LIMIT', message: 'rate limit' }, 1, policy)).toBe(true)
      expect(handler.shouldRetry({ code: 'SERVICE_UNAVAILABLE', message: 'unavailable' }, 1, policy)).toBe(false)
    })
  })

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff for attempt 1', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: [],
      }

      const delay = handler.calculateBackoff(1, policy)

      // Base delay for attempt 1: 1000 * 2^0 = 1000ms
      // With 20% jitter: 1000-1200ms
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(1200)
    })

    it('should calculate exponential backoff for attempt 2', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: [],
      }

      const delay = handler.calculateBackoff(2, policy)

      // Base delay for attempt 2: 1000 * 2^1 = 2000ms
      // With 20% jitter: 2000-2400ms
      expect(delay).toBeGreaterThanOrEqual(2000)
      expect(delay).toBeLessThanOrEqual(2400)
    })

    it('should calculate exponential backoff for attempt 3', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: [],
      }

      const delay = handler.calculateBackoff(3, policy)

      // Base delay for attempt 3: 1000 * 2^2 = 4000ms
      // With 20% jitter: 4000-4800ms
      expect(delay).toBeGreaterThanOrEqual(4000)
      expect(delay).toBeLessThanOrEqual(4800)
    })

    it('should use custom backoffMs', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 500,
        retryableErrorCodes: [],
      }

      const delay = handler.calculateBackoff(1, policy)

      // Base delay for attempt 1: 500 * 2^0 = 500ms
      // With 20% jitter: 500-600ms
      expect(delay).toBeGreaterThanOrEqual(500)
      expect(delay).toBeLessThanOrEqual(600)
    })

    it('should add random jitter to prevent retry storms', () => {
      const policy: RetryPolicy = {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableErrorCodes: [],
      }

      // Calculate multiple delays to verify jitter
      const delays = Array.from({ length: 10 }, () => handler.calculateBackoff(1, policy))

      // All delays should be within range
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(1000)
        expect(delay).toBeLessThanOrEqual(1200)
      })

      // At least some delays should be different (jitter is random)
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('scheduleRetry', () => {
    it('should schedule retry with incremented attempt', async () => {
      const stepRun = {
        id: 'step-123',
        runId: 'run-456',
        organizationId: 'org-789',
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.FAILED,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(stepRepo.findById).mockResolvedValue(stepRun)
      vi.mocked(stepRepo.incrementAttempt).mockResolvedValue(2)

      const error: RetryableError = { code: 'TIMEOUT', message: 'timeout' }
      const step: StepDefinition = {
        key: 'plan',
        type: 'agent',
        config: {},
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          retryableErrorCodes: ['TIMEOUT'],
        },
      }

      const result = await handler.scheduleRetry('step-123', 'run-456', 'plan', 'org-789', error, step)

      expect(result).toBe(true)
      expect(stepRepo.incrementAttempt).toHaveBeenCalledWith('step-123')
      expect(eventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-456',
          organizationId: 'org-789',
          stepRunId: 'step-123',
          eventType: 'retry_scheduled',
          payload: expect.objectContaining({
            stepKey: 'plan',
            attempt: 2,
            errorCode: 'TIMEOUT',
            errorMessage: 'timeout',
          }),
        })
      )
      expect(jobQueue.enqueueStepJob).toHaveBeenCalledWith(
        'run-456',
        'plan',
        'org-789',
        expect.objectContaining({
          delay: expect.any(Number),
        })
      )
    })

    it('should not retry if max attempts exceeded', async () => {
      const stepRun = {
        id: 'step-123',
        runId: 'run-456',
        organizationId: 'org-789',
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.FAILED,
        attempt: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(stepRepo.findById).mockResolvedValue(stepRun)

      const error: WorkflowError = { code: 'TIMEOUT', message: 'timeout' }
      const step: StepDefinition = {
        key: 'plan',
        type: 'agent',
        config: {},
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          retryableErrorCodes: ['TIMEOUT'],
        },
      }

      const result = await handler.scheduleRetry('step-123', 'run-456', 'plan', 'org-789', error, step)

      expect(result).toBe(false)
      expect(stepRepo.incrementAttempt).not.toHaveBeenCalled()
      expect(eventRepo.appendEvent).not.toHaveBeenCalled()
      expect(jobQueue.enqueueStepJob).not.toHaveBeenCalled()
    })

    it('should return false if no retry policy', async () => {
      const stepRun = {
        id: 'step-123',
        runId: 'run-456',
        organizationId: 'org-789',
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.FAILED,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(stepRepo.findById).mockResolvedValue(stepRun)

      const error: WorkflowError = { code: 'TIMEOUT', message: 'timeout' }
      const step: StepDefinition = {
        key: 'plan',
        type: 'agent',
        config: {},
        // No retry policy
      }

      const result = await handler.scheduleRetry('step-123', 'run-456', 'plan', 'org-789', error, step)

      expect(result).toBe(false)
      expect(stepRepo.incrementAttempt).not.toHaveBeenCalled()
    })

    it('should throw error if step run not found', async () => {
      vi.mocked(stepRepo.findById).mockResolvedValue(null)

      const error: WorkflowError = { code: 'TIMEOUT', message: 'timeout' }
      const step: StepDefinition = {
        key: 'plan',
        type: 'agent',
        config: {},
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          retryableErrorCodes: ['TIMEOUT'],
        },
      }

      await expect(handler.scheduleRetry('step-999', 'run-456', 'plan', 'org-789', error, step)).rejects.toThrow(
        'Step run not found: step-999'
      )
    })

    it('should not retry non-retryable error codes', async () => {
      const stepRun = {
        id: 'step-123',
        runId: 'run-456',
        organizationId: 'org-789',
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.FAILED,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(stepRepo.findById).mockResolvedValue(stepRun)

      const error: WorkflowError = { code: 'VALIDATION_ERROR', message: 'invalid input' }
      const step: StepDefinition = {
        key: 'plan',
        type: 'agent',
        config: {},
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          retryableErrorCodes: ['TIMEOUT', 'NETWORK_ERROR'],
        },
      }

      const result = await handler.scheduleRetry('step-123', 'run-456', 'plan', 'org-789', error, step)

      expect(result).toBe(false)
      expect(stepRepo.incrementAttempt).not.toHaveBeenCalled()
    })
  })

  describe('markPermanentlyFailed', () => {
    it('should emit step_failed_permanently event', async () => {
      const error: RetryableError = { code: 'TIMEOUT', message: 'timeout' }

      await handler.markPermanentlyFailed('step-123', 'run-456', 'org-789', error)

      expect(eventRepo.appendEvent).toHaveBeenCalledWith({
        runId: 'run-456',
        organizationId: 'org-789',
        stepRunId: 'step-123',
        eventType: 'step_failed_permanently',
        payload: {
          errorCode: 'TIMEOUT',
          errorMessage: 'timeout',
          reason: 'Max retry attempts exceeded',
        },
      })
    })

    it('should handle different error codes', async () => {
      const error: RetryableError = { code: 'NETWORK_ERROR', message: 'connection failed' }

      await handler.markPermanentlyFailed('step-456', 'run-789', 'org-123', error)

      expect(eventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            errorCode: 'NETWORK_ERROR',
            errorMessage: 'connection failed',
          }),
        })
      )
    })
  })
})
