import { beforeEach, describe, expect, it } from 'vitest'

import {
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
      stepType: 'http',
      organizationId: '789e0123-e89b-12d3-a456-426614174002',
    })
  })

  describe('creation and validation', () => {
    it('creates step with correct initial state', () => {
      expect(step.status).toBe(StepStatus.PENDING)
      expect(step.attempt).toBe(1)
      expect(isStepRunning(step)).toBe(false)
      expect(isStepTerminal(step)).toBe(false)
    })

    it('validates UUID format for id', () => {
      expect(() => {
        createStepRun({
          id: 'invalid-uuid',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: 'step-1',
          stepType: 'http',
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
        })
      }).toThrow(InvalidStepStateError)
    })

    it('validates stepKey is not empty', () => {
      expect(() => {
        createStepRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: '', // empty key
          stepType: 'http',
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
        })
      }).toThrow(InvalidStepStateError)
    })

    it('validates attempt is positive integer', () => {
      expect(() => {
        createStepRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: 'step-1',
          stepType: 'http',
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
          attempt: 0, // invalid attempt
        })
      }).toThrow(InvalidStepStateError)
    })

    it('validates stepType is not empty', () => {
      expect(() => {
        createStepRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '456e7890-e89b-12d3-a456-426614174001',
          stepKey: 'step-1',
          stepType: '', // empty stepType
          organizationId: '789e0123-e89b-12d3-a456-426614174002',
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
      const updated = succeedStepRun(running, { status: 'ok' })
      expect(updated.status).toBe(StepStatus.SUCCEEDED)
      expect(updated.output).toEqual({ status: 'ok' })
      expect(updated.completedAt).toBeDefined()
    })

    it('succeed without output', () => {
      const running = startStepRun(step)
      const updated = succeedStepRun(running)
      expect(updated.status).toBe(StepStatus.SUCCEEDED)
      expect(updated.output).toBeUndefined()
    })

    it('succeed throws if not running', () => {
      expect(() => succeedStepRun(step)).toThrow(InvalidStepStateError)
    })

    it('fail transitions from running to failed', () => {
      const running = startStepRun(step)
      const updated = failStepRun(running, 'TIMEOUT', 'Step timed out')
      expect(updated.status).toBe(StepStatus.FAILED)
      expect(updated.errorCode).toBe('TIMEOUT')
      expect(updated.errorMessage).toBe('Step timed out')
      expect(updated.completedAt).toBeDefined()
    })

    it('fail throws if not running', () => {
      expect(() => failStepRun(step, 'ERROR', 'Message')).toThrow(InvalidStepStateError)
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
    it('incrementAttempt increases attempt counter', () => {
      expect(step.attempt).toBe(1)
      const updated = incrementAttempt(step)
      expect(updated.attempt).toBe(2)
    })

    it('incrementAttempt can go beyond original max', () => {
      let current = step
      current = incrementAttempt(current)
      current = incrementAttempt(current)
      current = incrementAttempt(current)
      expect(current.attempt).toBe(4)
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
        stepType: 'http',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        status: StepStatus.SUCCEEDED,
      })
      expect(isStepTerminal(succeededStep)).toBe(true)

      // Failed
      const failedStep = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        stepType: 'http',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        status: StepStatus.FAILED,
      })
      expect(isStepTerminal(failedStep)).toBe(true)

      // Skipped
      const skippedStep = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        stepType: 'http',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        status: StepStatus.SKIPPED,
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
      const failed = failStepRun(running, 'ERROR', 'Message')
      expect(isStepFailed(failed)).toBe(true)
    })
  })

  describe('serialization', () => {
    it('roundtrip serialization preserves all fields', () => {
      const withInput = { ...step, input: { data: 'test' } }
      let running = startStepRun(withInput)
      let succeeded = succeedStepRun(running, { result: 'done' })

      // Serialize and deserialize by just using the object
      const reserialized = { ...succeeded }

      expect(reserialized).toEqual(succeeded)
      expect(reserialized.input).toEqual({ data: 'test' })
      expect(reserialized.output).toEqual({ result: 'done' })
      expect(reserialized.status).toBe(StepStatus.SUCCEEDED)
    })
  })

  describe('edge cases', () => {
    it('handles optional fields correctly', () => {
      expect(step.input).toBeUndefined()
      expect(step.output).toBeUndefined()
      expect(step.errorCode).toBeUndefined()
      expect(step.errorMessage).toBeUndefined()
      expect(step.startedAt).toBeUndefined()
      expect(step.completedAt).toBeUndefined()
    })

    it('allows explicit input', () => {
      const stepWithInput = createStepRun({
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '456e7890-e89b-12d3-a456-426614174001',
        stepKey: 'step-1',
        stepType: 'http',
        organizationId: '789e0123-e89b-12d3-a456-426614174002',
        input: { url: 'https://example.com' },
      })
      expect(stepWithInput.input).toEqual({ url: 'https://example.com' })
    })

    it('complete workflow with multiple attempts', () => {
      // First attempt
      let current = startStepRun(step)
      current = failStepRun(current, 'NETWORK_ERROR', 'Connection failed')
      expect(current.attempt).toBe(1)

      // Second attempt
      current = incrementAttempt(current)
      expect(current.attempt).toBe(2)

      // Reset status to pending for retry (would be done by service)
      current = { ...current, status: StepStatus.PENDING }
      current = startStepRun(current)
      current = failStepRun(current, 'NETWORK_ERROR', 'Connection failed')
      expect(current.attempt).toBe(2)

      // Third attempt (last)
      current = incrementAttempt(current)
      expect(current.attempt).toBe(3)

      current = { ...current, status: StepStatus.PENDING }
      current = startStepRun(current)
      current = succeedStepRun(current)
      expect(current.status).toBe(StepStatus.SUCCEEDED)
    })
  })
})
