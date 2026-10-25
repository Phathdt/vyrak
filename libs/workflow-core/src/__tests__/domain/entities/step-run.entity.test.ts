import { beforeEach, describe, expect, it } from 'vitest'
import {
  StepRunEntity,
} from '../../../domain/entities/step-run.entity'
import { InvalidStepStateError } from '../../../domain/errors/invalid-step-state.error'
import { StepStatus } from '../../../domain/step-types'

describe('StepRunEntity', () => {
  let entity: StepRunEntity

  beforeEach(() => {
    entity = new StepRunEntity(
      '123e4567-e89b-12d3-a456-426614174000',
      '456e7890-e89b-12d3-a456-426614174001',
      'step-1',
      '789e0123-e89b-12d3-a456-426614174002',
      '999e0123-e89b-12d3-a456-426614174003',
      StepStatus.PENDING,
      1,
      3
    )
  })

  describe('creation and validation', () => {
    it('creates entity with correct initial state', () => {
      expect(entity.status).toBe(StepStatus.PENDING)
      expect(entity.attempt).toBe(1)
      expect(entity.maxAttempts).toBe(3)
      expect(entity.isRunning()).toBe(false)
      expect(entity.isTerminal()).toBe(false)
    })

    it('validates UUID format for id', () => {
      expect(() => {
        new StepRunEntity(
          'invalid-uuid',
          '456e7890-e89b-12d3-a456-426614174001',
          'step-1',
          '789e0123-e89b-12d3-a456-426614174002',
          '999e0123-e89b-12d3-a456-426614174003',
          StepStatus.PENDING,
          1,
          3
        )
      }).toThrow(InvalidStepStateError)
    })

    it('validates stepKey is not empty', () => {
      expect(() => {
        new StepRunEntity(
          '123e4567-e89b-12d3-a456-426614174000',
          '456e7890-e89b-12d3-a456-426614174001',
          '', // empty key
          '789e0123-e89b-12d3-a456-426614174002',
          '999e0123-e89b-12d3-a456-426614174003',
          StepStatus.PENDING,
          1,
          3
        )
      }).toThrow(InvalidStepStateError)
    })

    it('validates attempt is positive integer', () => {
      expect(() => {
        new StepRunEntity(
          '123e4567-e89b-12d3-a456-426614174000',
          '456e7890-e89b-12d3-a456-426614174001',
          'step-1',
          '789e0123-e89b-12d3-a456-426614174002',
          '999e0123-e89b-12d3-a456-426614174003',
          StepStatus.PENDING,
          0, // invalid attempt
          3
        )
      }).toThrow(InvalidStepStateError)
    })

    it('validates maxAttempts is positive integer', () => {
      expect(() => {
        new StepRunEntity(
          '123e4567-e89b-12d3-a456-426614174000',
          '456e7890-e89b-12d3-a456-426614174001',
          'step-1',
          '789e0123-e89b-12d3-a456-426614174002',
          '999e0123-e89b-12d3-a456-426614174003',
          StepStatus.PENDING,
          1,
          0 // invalid maxAttempts
        )
      }).toThrow(InvalidStepStateError)
    })
  })

  describe('lifecycle methods', () => {
    it('start transitions from pending to running', () => {
      entity.start()
      expect(entity.status).toBe(StepStatus.RUNNING)
      expect(entity.startedAt).toBeDefined()
      expect(entity.startedAt).toBeInstanceOf(Date)
    })

    it('start throws if not in pending state', () => {
      entity.start()
      expect(() => entity.start()).toThrow(InvalidStepStateError)
    })

    it('succeed transitions from running to succeeded', () => {
      entity.start()
      entity.succeed('output-ref-123')
      expect(entity.status).toBe(StepStatus.SUCCEEDED)
      expect(entity.outputRef).toBe('output-ref-123')
      expect(entity.completedAt).toBeDefined()
    })

    it('succeed without outputRef', () => {
      entity.start()
      entity.succeed()
      expect(entity.status).toBe(StepStatus.SUCCEEDED)
      expect(entity.outputRef).toBeUndefined()
    })

    it('succeed throws if not running', () => {
      expect(() => entity.succeed()).toThrow(InvalidStepStateError)
    })

    it('fail transitions from running to failed', () => {
      entity.start()
      entity.fail('TIMEOUT', 'Step timed out', true)
      expect(entity.status).toBe(StepStatus.FAILED)
      expect(entity.errorCode).toBe('TIMEOUT')
      expect(entity.errorMessage).toBe('Step timed out')
      expect(entity.retryable).toBe(true)
      expect(entity.completedAt).toBeDefined()
    })

    it('fail throws if not running', () => {
      expect(() => entity.fail('ERROR', 'Message', false)).toThrow(
        InvalidStepStateError
      )
    })

    it('skip transitions from pending to skipped', () => {
      entity.skip()
      expect(entity.status).toBe(StepStatus.SKIPPED)
      expect(entity.completedAt).toBeDefined()
    })

    it('skip throws if not pending', () => {
      entity.start()
      expect(() => entity.skip()).toThrow(InvalidStepStateError)
    })
  })

  describe('retry logic', () => {
    it('canRetry returns true when retryable and attempts remaining', () => {
      entity.start()
      entity.fail('ERROR', 'Message', true)
      expect(entity.canRetry()).toBe(true)
    })

    it('canRetry returns false when not retryable', () => {
      entity.start()
      entity.fail('ERROR', 'Message', false)
      expect(entity.canRetry()).toBe(false)
    })

    it('canRetry returns false when max attempts reached', () => {
      entity.attempt = 3 // at max
      entity.retryable = true
      expect(entity.canRetry()).toBe(false)
    })

    it('incrementAttempt increases attempt counter', () => {
      expect(entity.attempt).toBe(1)
      entity.incrementAttempt()
      expect(entity.attempt).toBe(2)
    })

    it('incrementAttempt throws when at max attempts', () => {
      entity.attempt = 3 // at max
      expect(() => entity.incrementAttempt()).toThrow(InvalidStepStateError)
    })

    it('incrementAttempt updates updatedAt', () => {
      const oldUpdatedAt = entity.updatedAt
      entity.incrementAttempt()
      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime()
      )
    })
  })

  describe('status checks', () => {
    it('isRunning returns true only in running state', () => {
      expect(entity.isRunning()).toBe(false)
      entity.start()
      expect(entity.isRunning()).toBe(true)
      entity.succeed()
      expect(entity.isRunning()).toBe(false)
    })

    it('isTerminal returns true for terminal states', () => {
      expect(entity.isTerminal()).toBe(false)

      entity.start()
      expect(entity.isTerminal()).toBe(false)

      entity.succeed()
      expect(entity.isTerminal()).toBe(true)
    })

    it('isTerminal recognizes all terminal states', () => {
      // Succeeded
      const succeededEntity = new StepRunEntity(
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001',
        'step-1',
        '789e0123-e89b-12d3-a456-426614174002',
        '999e0123-e89b-12d3-a456-426614174003',
        StepStatus.SUCCEEDED,
        1,
        3
      )
      expect(succeededEntity.isTerminal()).toBe(true)

      // Failed
      const failedEntity = new StepRunEntity(
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001',
        'step-1',
        '789e0123-e89b-12d3-a456-426614174002',
        '999e0123-e89b-12d3-a456-426614174003',
        StepStatus.FAILED,
        1,
        3
      )
      expect(failedEntity.isTerminal()).toBe(true)

      // Skipped
      const skippedEntity = new StepRunEntity(
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001',
        'step-1',
        '789e0123-e89b-12d3-a456-426614174002',
        '999e0123-e89b-12d3-a456-426614174003',
        StepStatus.SKIPPED,
        1,
        3
      )
      expect(skippedEntity.isTerminal()).toBe(true)
    })
  })

  describe('serialization', () => {
    it('toData returns complete data object', () => {
      const data = entity.toData()
      expect(data.id).toBe(entity.id)
      expect(data.runId).toBe(entity.runId)
      expect(data.stepKey).toBe(entity.stepKey)
      expect(data.status).toBe(entity.status)
      expect(data.attempt).toBe(entity.attempt)
      expect(data.maxAttempts).toBe(entity.maxAttempts)
      expect(data.createdAt).toBeInstanceOf(Date)
    })

    it('fromData creates entity from data', () => {
      entity.inputRef = 'input-123'
      entity.start()
      entity.fail('ERROR', 'Test error', true)

      const data = entity.toData()
      const restored = StepRunEntity.fromData(data)

      expect(restored.id).toBe(entity.id)
      expect(restored.status).toBe(StepStatus.FAILED)
      expect(restored.errorCode).toBe('ERROR')
      expect(restored.errorMessage).toBe('Test error')
      expect(restored.retryable).toBe(true)
      expect(restored.inputRef).toBe('input-123')
      expect(restored.startedAt).toBeDefined()
      expect(restored.completedAt).toBeDefined()
    })

    it('roundtrip serialization preserves all fields', () => {
      entity.inputRef = 'input-ref'
      entity.start()
      entity.succeed('output-ref')

      const data = entity.toData()
      const restored = StepRunEntity.fromData(data)
      const restoredData = restored.toData()

      expect(restoredData).toEqual(data)
    })
  })

  describe('edge cases', () => {
    it('handles optional fields correctly', () => {
      expect(entity.inputRef).toBeUndefined()
      expect(entity.outputRef).toBeUndefined()
      expect(entity.errorCode).toBeUndefined()
      expect(entity.errorMessage).toBeUndefined()
      expect(entity.startedAt).toBeUndefined()
      expect(entity.completedAt).toBeUndefined()
    })

    it('retryable defaults to false', () => {
      expect(entity.retryable).toBe(false)
    })

    it('allows explicit inputRef', () => {
      const entityWithInput = new StepRunEntity(
        '123e4567-e89b-12d3-a456-426614174000',
        '456e7890-e89b-12d3-a456-426614174001',
        'step-1',
        '789e0123-e89b-12d3-a456-426614174002',
        '999e0123-e89b-12d3-a456-426614174003',
        StepStatus.PENDING,
        1,
        3,
        'input-ref-xyz'
      )
      expect(entityWithInput.inputRef).toBe('input-ref-xyz')
    })

    it('complete retry workflow', () => {
      // First attempt
      entity.start()
      entity.fail('NETWORK_ERROR', 'Connection failed', true)
      expect(entity.canRetry()).toBe(true)

      // Second attempt
      entity.incrementAttempt()
      expect(entity.attempt).toBe(2)

      // Reset status to pending for retry (would be done by service)
      entity.status = StepStatus.PENDING
      entity.start()
      entity.fail('NETWORK_ERROR', 'Connection failed', true)
      expect(entity.canRetry()).toBe(true)

      // Third attempt (last)
      entity.incrementAttempt()
      expect(entity.attempt).toBe(3)
      expect(entity.canRetry()).toBe(false) // At max attempts, cannot retry

      entity.status = StepStatus.PENDING
      entity.start()
      entity.succeed()
      expect(entity.status).toBe(StepStatus.SUCCEEDED)
    })
  })
})
