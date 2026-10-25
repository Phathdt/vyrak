import { beforeEach, describe, expect, it } from 'vitest'
import {
  WorkflowRunEntity,
} from '../../../domain/entities/workflow-run.entity'
import { InvalidStateTransitionError } from '../../../domain/errors/invalid-state-transition.error'
import { InvalidWorkflowStateError } from '../../../domain/errors/invalid-workflow-state.error'
import {
  WorkflowState,
} from '../../../domain/workflow-state'

describe('WorkflowRunEntity', () => {
  let entity: WorkflowRunEntity

  beforeEach(() => {
    entity = new WorkflowRunEntity(
      '123e4567-e89b-12d3-a456-426614174000',
      'checkout-flow',
      '1.0.0',
      '456e7890-e89b-12d3-a456-426614174001',
      '789e0123-e89b-12d3-a456-426614174002',
      WorkflowState.QUEUED,
      '111e2222-e89b-12d3-a456-426614174003',
      '999e0123-e89b-12d3-a456-426614174004'
    )
  })

  describe('creation and validation', () => {
    it('creates entity with correct initial state', () => {
      expect(entity.state).toBe(WorkflowState.QUEUED)
      expect(entity.isRunning()).toBe(false)
      expect(entity.isTerminal()).toBe(false)
      expect(entity.workflowKey).toBe('checkout-flow')
      expect(entity.workflowVersion).toBe('1.0.0')
    })

    it('validates UUID format for id', () => {
      expect(() => {
        new WorkflowRunEntity(
          'invalid-uuid',
          'checkout-flow',
          '1.0.0',
          '456e7890-e89b-12d3-a456-426614174001',
          '789e0123-e89b-12d3-a456-426614174002',
          WorkflowState.QUEUED,
          '111e2222-e89b-12d3-a456-426614174003',
          '999e0123-e89b-12d3-a456-426614174004'
        )
      }).toThrow(InvalidWorkflowStateError)
    })

    it('validates semver format for workflowVersion', () => {
      expect(() => {
        new WorkflowRunEntity(
          '123e4567-e89b-12d3-a456-426614174000',
          'checkout-flow',
          'v1.0', // invalid semver
          '456e7890-e89b-12d3-a456-426614174001',
          '789e0123-e89b-12d3-a456-426614174002',
          WorkflowState.QUEUED,
          '111e2222-e89b-12d3-a456-426614174003',
          '999e0123-e89b-12d3-a456-426614174004'
        )
      }).toThrow(InvalidWorkflowStateError)
    })

    it('validates workflowKey is not empty', () => {
      expect(() => {
        new WorkflowRunEntity(
          '123e4567-e89b-12d3-a456-426614174000',
          '', // empty key
          '1.0.0',
          '456e7890-e89b-12d3-a456-426614174001',
          '789e0123-e89b-12d3-a456-426614174002',
          WorkflowState.QUEUED,
          '111e2222-e89b-12d3-a456-426614174003',
          '999e0123-e89b-12d3-a456-426614174004'
        )
      }).toThrow(InvalidWorkflowStateError)
    })
  })

  describe('state transitions', () => {
    it('allows queued → running transition', () => {
      entity.transition(WorkflowState.RUNNING)
      expect(entity.state).toBe(WorkflowState.RUNNING)
      expect(entity.startedAt).toBeDefined()
      expect(entity.startedAt).toBeInstanceOf(Date)
    })

    it('allows running → succeeded transition', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.transition(WorkflowState.SUCCEEDED)
      expect(entity.state).toBe(WorkflowState.SUCCEEDED)
      expect(entity.completedAt).toBeDefined()
      expect(entity.completedAt).toBeInstanceOf(Date)
    })

    it('allows running → failed transition', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.transition(WorkflowState.FAILED)
      expect(entity.state).toBe(WorkflowState.FAILED)
      expect(entity.completedAt).toBeDefined()
    })

    it('allows running → waiting_approval transition', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.transition(WorkflowState.WAITING_APPROVAL)
      expect(entity.state).toBe(WorkflowState.WAITING_APPROVAL)
      expect(entity.completedAt).toBeUndefined()
    })

    it('allows waiting_approval → running transition', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.transition(WorkflowState.WAITING_APPROVAL)
      entity.transition(WorkflowState.RUNNING)
      expect(entity.state).toBe(WorkflowState.RUNNING)
    })

    it('rejects invalid transitions', () => {
      entity.transition(WorkflowState.RUNNING)
      expect(() => entity.transition(WorkflowState.QUEUED)).toThrow(
        InvalidStateTransitionError
      )
    })

    it('rejects transitions from terminal states', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.transition(WorkflowState.SUCCEEDED)
      expect(() => entity.transition(WorkflowState.RUNNING)).toThrow(
        InvalidStateTransitionError
      )
    })

    it('updates updatedAt timestamp on transition', () => {
      const oldUpdatedAt = entity.updatedAt
      entity.transition(WorkflowState.RUNNING)
      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime()
      )
    })

    it('sets startedAt only once on first running transition', () => {
      entity.transition(WorkflowState.RUNNING)
      const firstStartedAt = entity.startedAt
      entity.transition(WorkflowState.WAITING_APPROVAL)
      entity.transition(WorkflowState.RUNNING)
      expect(entity.startedAt).toBe(firstStartedAt)
    })
  })

  describe('business methods', () => {
    it('canStart returns true only when queued', () => {
      expect(entity.canStart()).toBe(true)
      entity.transition(WorkflowState.RUNNING)
      expect(entity.canStart()).toBe(false)
    })

    it('canCancel returns true for non-terminal states', () => {
      expect(entity.canCancel()).toBe(true)
      entity.transition(WorkflowState.RUNNING)
      expect(entity.canCancel()).toBe(true)
      entity.transition(WorkflowState.SUCCEEDED)
      expect(entity.canCancel()).toBe(false)
    })

    it('isRunning returns true only in running state', () => {
      expect(entity.isRunning()).toBe(false)
      entity.transition(WorkflowState.RUNNING)
      expect(entity.isRunning()).toBe(true)
      entity.transition(WorkflowState.SUCCEEDED)
      expect(entity.isRunning()).toBe(false)
    })

    it('isTerminal returns correct values', () => {
      expect(entity.isTerminal()).toBe(false)
      entity.transition(WorkflowState.RUNNING)
      expect(entity.isTerminal()).toBe(false)
      entity.transition(WorkflowState.SUCCEEDED)
      expect(entity.isTerminal()).toBe(true)
    })

    it('recordFailure sets error and transitions to failed', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.recordFailure('AGENT_FAILED', 'Agent execution failed')
      expect(entity.state).toBe(WorkflowState.FAILED)
      expect(entity.errorCode).toBe('AGENT_FAILED')
      expect(entity.errorMessage).toBe('Agent execution failed')
      expect(entity.completedAt).toBeDefined()
    })
  })

  describe('serialization', () => {
    it('toData returns complete data object', () => {
      const data = entity.toData()
      expect(data.id).toBe(entity.id)
      expect(data.workflowKey).toBe(entity.workflowKey)
      expect(data.workflowVersion).toBe(entity.workflowVersion)
      expect(data.state).toBe(entity.state)
      expect(data.createdAt).toBeInstanceOf(Date)
    })

    it('fromData creates entity from data', () => {
      entity.transition(WorkflowState.RUNNING)
      entity.recordFailure('TEST_ERROR', 'Test error message')
      const data = entity.toData()
      const restored = WorkflowRunEntity.fromData(data)

      expect(restored.id).toBe(entity.id)
      expect(restored.state).toBe(WorkflowState.FAILED)
      expect(restored.errorCode).toBe('TEST_ERROR')
      expect(restored.errorMessage).toBe('Test error message')
      expect(restored.startedAt).toBeDefined()
      expect(restored.completedAt).toBeDefined()
    })

    it('roundtrip serialization preserves all fields', () => {
      entity.currentStepKey = 'step-1'
      entity.transition(WorkflowState.RUNNING)

      const data = entity.toData()
      const restored = WorkflowRunEntity.fromData(data)
      const restoredData = restored.toData()

      expect(restoredData).toEqual(data)
    })
  })

  describe('edge cases', () => {
    it('handles optional fields correctly', () => {
      expect(entity.currentStepKey).toBeUndefined()
      expect(entity.errorCode).toBeUndefined()
      expect(entity.errorMessage).toBeUndefined()
      expect(entity.startedAt).toBeUndefined()
      expect(entity.completedAt).toBeUndefined()
    })

    it('allows setting currentStepKey', () => {
      entity.currentStepKey = 'step-1'
      expect(entity.currentStepKey).toBe('step-1')
    })

    it('recordFailure works from different states', () => {
      // From queued (should fail because cannot transition directly)
      expect(() =>
        entity.recordFailure('ERROR', 'Message')
      ).toThrow(InvalidStateTransitionError)

      // Create new entity in running state
      const runningEntity = new WorkflowRunEntity(
        '123e4567-e89b-12d3-a456-426614174000',
        'test-flow',
        '1.0.0',
        '456e7890-e89b-12d3-a456-426614174001',
        '789e0123-e89b-12d3-a456-426614174002',
        WorkflowState.RUNNING,
        '111e2222-e89b-12d3-a456-426614174003',
        '999e0123-e89b-12d3-a456-426614174004'
      )

      runningEntity.recordFailure('ERROR', 'Message')
      expect(runningEntity.state).toBe(WorkflowState.FAILED)
    })
  })
})
