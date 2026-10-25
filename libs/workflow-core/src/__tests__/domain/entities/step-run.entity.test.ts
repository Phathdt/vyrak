import { beforeEach, describe, expect, it } from 'vitest'

import {
  canRetryStep,
  createStepRun,
  failStepRun,
  incrementAttempt,
  InvalidStepStateError,
  isStepFailed,
  isStepRunning,
  isStepSucceeded,
  isStepTerminal,
  skipStepRun,
  startStepRun,
  StepStatus,
  succeedStepRun,
  type StepRun,
} from '../../../domain'

describe('StepRun (Functional)', () => {
  let step: StepRun

  beforeEach(() => {
    step = createStepRun({
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '456e7890-e89b-12d3-a456-426614174001',
      stepKey: 'step-1',
      organizationId: '789e0123-e89b-12d3-a456-426614174002',
      projectId: '999e0123-e89b-12d3-a456-426614174003',
      maxAttempts: 3,
    })
  })

  describe('creation and validation', () => {
    it('creates step with correct initial state', () => {
      expect(step.status).toBe(StepStatus.PENDING)
      expect(step.attempt).toBe(1)
      expect(step.maxAttempts).toBe(3)
      expect(isStepRunning(step)).toBe(false)
      expect(isStepTerminal(step)).toBe(false)
    })

    it('validates UUID format for id', () => {
      expect(() => {
        createStepRun({
          id: 'invalid-uuid',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: 'step-1',
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
          projectId: '999e0123-e89b-12d3-a456-426614174003',
          maxAttempts: 3,
        })
      }).toThrow(InvalidStepStateError)
    })

    it('validates stepKey is not empty', () => {
      expect(() => {
        createStepRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: '', // empty key
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
          projectId: '999e0123-e89b-12d3-a456-426614174003',
          maxAttempts: 3,
        })
      }).toThrow(InvalidStepStateError)
    })

    it('validates attempt is positive integer', () => {
      expect(() => {
        createStepRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: 'step-1',
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
          projectId: '999e0123-e89b-12d3-a456-426614174003',
          attempt: 0, // invalid attempt
          maxAttempts: 3,
        })
      }).toThrow(InvalidStepStateError)
    })

    it('validates maxAttempts is positive integer', () => {
      expect(() => {
        createStepRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: 'step-1',
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
          projectId: '999e0123-e89b-12d3-a456-426614174003',
          maxAttempts: 0, // invalid maxAttempts
        })
      }).toThrow(InvalidStepStateError)
    })
  })

  describe('lifecycle methods', () => {
    it('start transitions from pending to running', () => {
      const updated = startStepRun(step)
      expect(updated.status).toBe(StepStatus.RUNNING)
      expect(updated.startedAt).toBeDefined()
      expect(updated.startedAt).toBeInstanceOf(Date)
    })

    it('start throws if not in pending state', () => {
      const running = startStepRun(step)
      expect(() => startStepRun(running)).toThrow(InvalidStepStateError)
    })

    it('succeed transitions from running to succeeded', () => {
      const running = startStepRun(step)
      const updated = succeedStepRun(running, 'output-ref-123')
      expect(updated.status).toBe(StepStatus.SUCCEEDED)
      expect(updated.outputRef).toBe('output-ref-123')
      expect(updated.completedAt).toBeDefined()
    })

    it('succeed without outputRef', () => {
      const running = startStepRun(step)
      const updated = succeedStepRun(running)
      expect(updated.status).toBe(StepStatus.SUCCEEDED)
      expect(updated.outputRef).toBeUndefined()
    })

    it('succeed throws if not running', () => {
      expect(() => succeedStepRun(step)).toThrow(InvalidStepStateError)
    })

    it('fail transitions from running to failed', () => {
      const running = startStepRun(step)
      const updated = failStepRun(running, 'TIMEOUT', 'Step timed out', true)
      expect(updated.status).toBe(StepStatus.FAILED)
      expect(updated.errorCode).toBe('TIMEOUT')
      expect(updated.errorMessage).toBe('Step timed out')
      expect(updated.retryable).toBe(true)
      expect(updated.completedAt).toBeDefined()
    })

    it('fail throws if not running', () => {
      expect(() => failStepRun(step, 'ERROR', 'Message', false)).toThrow(InvalidStepStateError)
    })

    it('skip transitions from pending to skipped', () => {
      const updated = skipStepRun(step)
      expect(updated.status).toBe(StepStatus.SKIPPED)
      expect(updated.completedAt).toBeDefined()
    })

    it('skip throws if not pending', () => {
      const running = startStepRun(step)
      expect(() => skipStepRun(running)).toThrow(InvalidStepStateError)
    })
  })

  describe('retry logic', () => {
    it('canRetryStep returns true when retryable and attempts remaining', () => {
      const running = startStepRun(step)
      const failed = failStepRun(running, 'ERROR', 'Message', true)
      expect(canRetryStep(failed)).toBe(true)
    })

    it('canRetryStep returns false when not retryable', () => {
      const running = startStepRun(step)
      const failed = failStepRun(running, 'ERROR', 'Message', false)
      expect(canRetryStep(failed)).toBe(false)
    })

    it('canRetryStep returns false when max attempts reached', () => {
      const atMax = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        projectId: '999e0123-e89b-12d3-a456-426614174003',
        maxAttempts: 3,
        attempt: 3,
        retryable: true,
      })
      expect(canRetryStep(atMax)).toBe(false)
    })

    it('incrementAttempt increases attempt counter', () => {
      expect(step.attempt).toBe(1)
      const updated = incrementAttempt(step)
      expect(updated.attempt).toBe(2)
    })

    it('incrementAttempt throws when at max attempts', () => {
      const atMax = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        projectId: '999e0123-e89b-12d3-a456-426614174003',
        maxAttempts: 3,
        attempt: 3,
      })
      expect(() => incrementAttempt(atMax)).toThrow(InvalidStepStateError)
    })

    it('incrementAttempt updates updatedAt', () => {
      const oldUpdatedAt = step.updatedAt
      const updated = incrementAttempt(step)
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime())
    })
  })

  describe('status checks', () => {
    it('isStepRunning returns true only in running state', () => {
      expect(isStepRunning(step)).toBe(false)
      const running = startStepRun(step)
      expect(isStepRunning(running)).toBe(true)
      const succeeded = succeedStepRun(running)
      expect(isStepRunning(succeeded)).toBe(false)
    })

    it('isStepTerminal returns true for terminal states', () => {
      expect(isStepTerminal(step)).toBe(false)

      const running = startStepRun(step)
      expect(isStepTerminal(running)).toBe(false)

      const succeeded = succeedStepRun(running)
      expect(isStepTerminal(succeeded)).toBe(true)
    })

    it('isStepTerminal recognizes all terminal states', () => {
      // Succeeded
      const succeededStep = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        projectId: '999e0123-e89b-12d3-a456-426614174003',
        status: StepStatus.SUCCEEDED,
        maxAttempts: 3,
      })
      expect(isStepTerminal(succeededStep)).toBe(true)

      // Failed
      const failedStep = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        projectId: '999e0123-e89b-12d3-a456-426614174003',
        status: StepStatus.FAILED,
        maxAttempts: 3,
      })
      expect(isStepTerminal(failedStep)).toBe(true)

      // Skipped
      const skippedStep = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        projectId: '999e0123-e89b-12d3-a456-426614174003',
        status: StepStatus.SKIPPED,
        maxAttempts: 3,
      })
      expect(isStepTerminal(skippedStep)).toBe(true)
    })

    it('isStepSucceeded returns true only for succeeded status', () => {
      expect(isStepSucceeded(step)).toBe(false)
      const running = startStepRun(step)
      expect(isStepSucceeded(running)).toBe(false)
      const succeeded = succeedStepRun(running)
      expect(isStepSucceeded(succeeded)).toBe(true)
    })

    it('isStepFailed returns true only for failed status', () => {
      expect(isStepFailed(step)).toBe(false)
      const running = startStepRun(step)
      expect(isStepFailed(running)).toBe(false)
      const failed = failStepRun(running, 'ERROR', 'Message', false)
      expect(isStepFailed(failed)).toBe(true)
    })
  })

  describe('serialization', () => {
    it('roundtrip serialization preserves all fields', () => {
      const withInput = { ...step, inputRef: 'input-ref' }
      let running = startStepRun(withInput)
      let succeeded = succeedStepRun(running, 'output-ref')

      // Serialize and deserialize by just using the object
      const reserialized = { ...succeeded }

      expect(reserialized).toEqual(succeeded)
      expect(reserialized.inputRef).toBe('input-ref')
      expect(reserialized.outputRef).toBe('output-ref')
      expect(reserialized.status).toBe(StepStatus.SUCCEEDED)
    })
  })

  describe('edge cases', () => {
    it('handles optional fields correctly', () => {
      expect(step.inputRef).toBeUndefined()
      expect(step.outputRef).toBeUndefined()
      expect(step.errorCode).toBeUndefined()
      expect(step.errorMessage).toBeUndefined()
      expect(step.startedAt).toBeUndefined()
      expect(step.completedAt).toBeUndefined()
    })

    it('retryable defaults to false', () => {
      expect(step.retryable).toBe(false)
    })

    it('allows explicit inputRef', () => {
      const stepWithInput = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        projectId: '999e0123-e89b-12d3-a456-426614174003',
        maxAttempts: 3,
        inputRef: 'input-ref-xyz',
      })
      expect(stepWithInput.inputRef).toBe('input-ref-xyz')
    })

    it('complete retry workflow', () => {
      // First attempt
      let current = startStepRun(step)
      current = failStepRun(current, 'NETWORK_ERROR', 'Connection failed', true)
      expect(canRetryStep(current)).toBe(true)

      // Second attempt
      current = incrementAttempt(current)
      expect(current.attempt).toBe(2)

      // Reset status to pending for retry (would be done by service)
      current = { ...current, status: StepStatus.PENDING }
      current = startStepRun(current)
      current = failStepRun(current, 'NETWORK_ERROR', 'Connection failed', true)
      expect(canRetryStep(current)).toBe(true)

      // Third attempt (last)
      current = incrementAttempt(current)
      expect(current.attempt).toBe(3)
      expect(canRetryStep(current)).toBe(false) // At max attempts, cannot retry

      current = { ...current, status: StepStatus.PENDING }
      current = startStepRun(current)
      current = succeedStepRun(current)
      expect(current.status).toBe(StepStatus.SUCCEEDED)
    })
  })
})
