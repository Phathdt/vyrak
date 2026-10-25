import { beforeEach, describe, expect, it } from 'vitest'

import {
  canCancelWorkflow,
  canStartWorkflow,
  createWorkflowRun,
  InvalidStateTransitionError,
  InvalidWorkflowStateError,
  isRunning,
  isTerminal,
  recordFailure,
  transitionWorkflow,
  WorkflowState,
  type WorkflowRun,
} from '../../../domain'

describe('WorkflowRun', () => {
  let run: WorkflowRun

  beforeEach(() => {
    run = createWorkflowRun({
      id: '123e4567-e89b-12d3-a456-426614174000',
      workflowKey: 'checkout-flow',
      workflowVersion: '1.0.0',
      organizationId: '456e7890-e89b-12d3-a456-426614174001',
      projectId: '789e0123-e89b-12d3-a456-426614174002',
      initiatedByUserId: '111e2222-e89b-12d3-a456-426614174003',
      idempotencyKey: '999e0123-e89b-12d3-a456-426614174004',
    })
  })

  describe('creation and validation', () => {
    it('creates run with correct initial state', () => {
      expect(run.state).toBe(WorkflowState.QUEUED)
      expect(isRunning(run)).toBe(false)
      expect(isTerminal(run)).toBe(false)
      expect(run.workflowKey).toBe('checkout-flow')
      expect(run.workflowVersion).toBe('1.0.0')
    })

    it('validates UUID format for id', () => {
      expect(() => {
        createWorkflowRun({
          id: 'invalid-uuid',
          workflowKey: 'checkout-flow',
          workflowVersion: '1.0.0',
          organizationId: '456e7890-e89b-12d3-a456-426614174001',
          projectId: '789e0123-e89b-12d3-a456-426614174002',
          initiatedByUserId: '111e2222-e89b-12d3-a456-426614174003',
          idempotencyKey: '999e0123-e89b-12d3-a456-426614174004',
        })
      }).toThrow(InvalidWorkflowStateError)
    })

    it('validates semver format for workflowVersion', () => {
      expect(() => {
        createWorkflowRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          workflowKey: 'checkout-flow',
          workflowVersion: 'v1.0', // invalid semver
          organizationId: '456e7890-e89b-12d3-a456-426614174001',
          projectId: '789e0123-e89b-12d3-a456-426614174002',
          initiatedByUserId: '111e2222-e89b-12d3-a456-426614174003',
          idempotencyKey: '999e0123-e89b-12d3-a456-426614174004',
        })
      }).toThrow(InvalidWorkflowStateError)
    })

    it('validates workflowKey is not empty', () => {
      expect(() => {
        createWorkflowRun({
          id: '123e4567-e89b-12d3-a456-426614174000',
          workflowKey: '', // empty key
          workflowVersion: '1.0.0',
          organizationId: '456e7890-e89b-12d3-a456-426614174001',
          projectId: '789e0123-e89b-12d3-a456-426614174002',
          initiatedByUserId: '111e2222-e89b-12d3-a456-426614174003',
          idempotencyKey: '999e0123-e89b-12d3-a456-426614174004',
        })
      }).toThrow(InvalidWorkflowStateError)
    })
  })

  describe('state transitions', () => {
    it('allows queued → running transition', () => {
      const transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(transitioned.state).toBe(WorkflowState.RUNNING)
      expect(transitioned.startedAt).toBeDefined()
      expect(transitioned.startedAt).toBeInstanceOf(Date)
      // Original should be unchanged
      expect(run.state).toBe(WorkflowState.QUEUED)
    })

    it('allows running → succeeded transition', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = transitionWorkflow(transitioned, WorkflowState.SUCCEEDED)
      expect(transitioned.state).toBe(WorkflowState.SUCCEEDED)
      expect(transitioned.completedAt).toBeDefined()
      expect(transitioned.completedAt).toBeInstanceOf(Date)
    })

    it('allows running → failed transition', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = transitionWorkflow(transitioned, WorkflowState.FAILED)
      expect(transitioned.state).toBe(WorkflowState.FAILED)
      expect(transitioned.completedAt).toBeDefined()
    })

    it('allows running → waiting_approval transition', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = transitionWorkflow(transitioned, WorkflowState.WAITING_APPROVAL)
      expect(transitioned.state).toBe(WorkflowState.WAITING_APPROVAL)
      expect(transitioned.completedAt).toBeUndefined()
    })

    it('allows waiting_approval → running transition', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = transitionWorkflow(transitioned, WorkflowState.WAITING_APPROVAL)
      transitioned = transitionWorkflow(transitioned, WorkflowState.RUNNING)
      expect(transitioned.state).toBe(WorkflowState.RUNNING)
    })

    it('rejects invalid transitions', () => {
      const transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(() => transitionWorkflow(transitioned, WorkflowState.QUEUED)).toThrow(InvalidStateTransitionError)
    })

    it('rejects transitions from terminal states', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = transitionWorkflow(transitioned, WorkflowState.SUCCEEDED)
      expect(() => transitionWorkflow(transitioned, WorkflowState.RUNNING)).toThrow(InvalidStateTransitionError)
    })

    it('updates updatedAt timestamp on transition', () => {
      const oldUpdatedAt = run.updatedAt
      const transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(transitioned.updatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime())
    })

    it('sets startedAt only once on first running transition', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      const firstStartedAt = transitioned.startedAt
      transitioned = transitionWorkflow(transitioned, WorkflowState.WAITING_APPROVAL)
      transitioned = transitionWorkflow(transitioned, WorkflowState.RUNNING)
      expect(transitioned.startedAt).toBe(firstStartedAt)
    })
  })

  describe('business methods', () => {
    it('canStartWorkflow returns true only when queued', () => {
      expect(canStartWorkflow(run)).toBe(true)
      const transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(canStartWorkflow(transitioned)).toBe(false)
    })

    it('canCancelWorkflow returns true for non-terminal states', () => {
      expect(canCancelWorkflow(run)).toBe(true)
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(canCancelWorkflow(transitioned)).toBe(true)
      transitioned = transitionWorkflow(transitioned, WorkflowState.SUCCEEDED)
      expect(canCancelWorkflow(transitioned)).toBe(false)
    })

    it('isRunning returns true only in running state', () => {
      expect(isRunning(run)).toBe(false)
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(isRunning(transitioned)).toBe(true)
      transitioned = transitionWorkflow(transitioned, WorkflowState.SUCCEEDED)
      expect(isRunning(transitioned)).toBe(false)
    })

    it('isTerminal returns correct values', () => {
      expect(isTerminal(run)).toBe(false)
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      expect(isTerminal(transitioned)).toBe(false)
      transitioned = transitionWorkflow(transitioned, WorkflowState.SUCCEEDED)
      expect(isTerminal(transitioned)).toBe(true)
    })

    it('recordFailure sets error and transitions to failed', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = recordFailure(transitioned, 'AGENT_FAILED', 'Agent execution failed')
      expect(transitioned.state).toBe(WorkflowState.FAILED)
      expect(transitioned.errorCode).toBe('AGENT_FAILED')
      expect(transitioned.errorMessage).toBe('Agent execution failed')
      expect(transitioned.completedAt).toBeDefined()
    })
  })

  describe('serialization', () => {
    it('workflow run object is serializable', () => {
      const serialized = JSON.stringify(run)
      const deserialized = JSON.parse(serialized)
      expect(deserialized.id).toBe(run.id)
      expect(deserialized.workflowKey).toBe(run.workflowKey)
      expect(deserialized.workflowVersion).toBe(run.workflowVersion)
      expect(deserialized.state).toBe(run.state)
    })

    it('maintains data through transitions', () => {
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = recordFailure(transitioned, 'TEST_ERROR', 'Test error message')

      expect(transitioned.id).toBe(run.id)
      expect(transitioned.state).toBe(WorkflowState.FAILED)
      expect(transitioned.errorCode).toBe('TEST_ERROR')
      expect(transitioned.errorMessage).toBe('Test error message')
      expect(transitioned.startedAt).toBeDefined()
      expect(transitioned.completedAt).toBeDefined()
    })

    it('preserves all fields through transitions', () => {
      let transitioned: WorkflowRun = {
        ...run,
        currentStepKey: 'step-1',
      }
      transitioned = transitionWorkflow(transitioned, WorkflowState.RUNNING)

      expect(transitioned.id).toBe(run.id)
      expect(transitioned.currentStepKey).toBe('step-1')
      expect(transitioned.state).toBe(WorkflowState.RUNNING)
    })
  })

  describe('edge cases', () => {
    it('handles optional fields correctly', () => {
      expect(run.currentStepKey).toBeUndefined()
      expect(run.errorCode).toBeUndefined()
      expect(run.errorMessage).toBeUndefined()
      expect(run.startedAt).toBeUndefined()
      expect(run.completedAt).toBeUndefined()
    })

    it('allows setting currentStepKey through spread', () => {
      const updated: WorkflowRun = {
        ...run,
        currentStepKey: 'step-1',
      }
      expect(updated.currentStepKey).toBe('step-1')
    })

    it('recordFailure works from running state', () => {
      // recordFailure requires transition to RUNNING first (cannot transition from QUEUED directly to FAILED)
      let transitioned = transitionWorkflow(run, WorkflowState.RUNNING)
      transitioned = recordFailure(transitioned, 'ERROR', 'Message')
      expect(transitioned.state).toBe(WorkflowState.FAILED)
    })

    it('recordFailure throws when transitioning from invalid state', () => {
      // QUEUED cannot go directly to FAILED
      expect(() => recordFailure(run, 'ERROR', 'Message')).toThrow(InvalidStateTransitionError)
    })
  })
})
