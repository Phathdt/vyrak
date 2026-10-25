import { beforeEach, describe, expect, it } from 'vitest'

import { InvalidStateTransitionError } from '../domain/errors/invalid-state-transition.error'
import { WorkflowState, WorkflowStateMachine } from '../domain/workflow-state'

describe('WorkflowStateMachine', () => {
  let machine: WorkflowStateMachine

  beforeEach(() => {
    machine = new WorkflowStateMachine()
  })

  describe('canTransition', () => {
    describe('valid transitions from QUEUED', () => {
      it('allows queued → running', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, WorkflowState.RUNNING)).toBe(true)
      })

      it('allows queued → cancelled', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, WorkflowState.CANCELLED)).toBe(true)
      })
    })

    describe('valid transitions from RUNNING', () => {
      it('allows running → waiting_approval', () => {
        expect(machine.canTransition(WorkflowState.RUNNING, WorkflowState.WAITING_APPROVAL)).toBe(true)
      })

      it('allows running → succeeded', () => {
        expect(machine.canTransition(WorkflowState.RUNNING, WorkflowState.SUCCEEDED)).toBe(true)
      })

      it('allows running → failed', () => {
        expect(machine.canTransition(WorkflowState.RUNNING, WorkflowState.FAILED)).toBe(true)
      })

      it('allows running → cancelled', () => {
        expect(machine.canTransition(WorkflowState.RUNNING, WorkflowState.CANCELLED)).toBe(true)
      })
    })

    describe('valid transitions from WAITING_APPROVAL', () => {
      it('allows waiting_approval → running', () => {
        expect(machine.canTransition(WorkflowState.WAITING_APPROVAL, WorkflowState.RUNNING)).toBe(true)
      })

      it('allows waiting_approval → succeeded', () => {
        expect(machine.canTransition(WorkflowState.WAITING_APPROVAL, WorkflowState.SUCCEEDED)).toBe(true)
      })

      it('allows waiting_approval → failed', () => {
        expect(machine.canTransition(WorkflowState.WAITING_APPROVAL, WorkflowState.FAILED)).toBe(true)
      })

      it('allows waiting_approval → cancelled', () => {
        expect(machine.canTransition(WorkflowState.WAITING_APPROVAL, WorkflowState.CANCELLED)).toBe(true)
      })
    })

    describe('invalid transitions from QUEUED', () => {
      it('rejects queued → waiting_approval', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, WorkflowState.WAITING_APPROVAL)).toBe(false)
      })

      it('rejects queued → succeeded', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, WorkflowState.SUCCEEDED)).toBe(false)
      })

      it('rejects queued → failed', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, WorkflowState.FAILED)).toBe(false)
      })
    })

    describe('invalid transitions from RUNNING', () => {
      it('rejects running → queued', () => {
        expect(machine.canTransition(WorkflowState.RUNNING, WorkflowState.QUEUED)).toBe(false)
      })
    })

    describe('terminal states - no transitions allowed', () => {
      it('rejects succeeded → running', () => {
        expect(machine.canTransition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)).toBe(false)
      })

      it('rejects succeeded → queued', () => {
        expect(machine.canTransition(WorkflowState.SUCCEEDED, WorkflowState.QUEUED)).toBe(false)
      })

      it('rejects failed → running', () => {
        expect(machine.canTransition(WorkflowState.FAILED, WorkflowState.RUNNING)).toBe(false)
      })

      it('rejects failed → queued', () => {
        expect(machine.canTransition(WorkflowState.FAILED, WorkflowState.QUEUED)).toBe(false)
      })

      it('rejects cancelled → running', () => {
        expect(machine.canTransition(WorkflowState.CANCELLED, WorkflowState.RUNNING)).toBe(false)
      })

      it('rejects cancelled → queued', () => {
        expect(machine.canTransition(WorkflowState.CANCELLED, WorkflowState.QUEUED)).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('returns false for null from state', () => {
        expect(machine.canTransition(null as any, WorkflowState.RUNNING)).toBe(false)
      })

      it('returns false for undefined from state', () => {
        expect(machine.canTransition(undefined as any, WorkflowState.RUNNING)).toBe(false)
      })

      it('returns false for null to state', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, null as any)).toBe(false)
      })

      it('returns false for undefined to state', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, undefined as any)).toBe(false)
      })

      it('returns false for invalid enum value as from state', () => {
        expect(machine.canTransition('invalid' as any, WorkflowState.RUNNING)).toBe(false)
      })

      it('returns false for invalid enum value as to state', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, 'invalid' as any)).toBe(false)
      })
    })
  })

  describe('transition', () => {
    describe('valid transitions', () => {
      it('returns new state for queued → running', () => {
        const result = machine.transition(WorkflowState.QUEUED, WorkflowState.RUNNING)
        expect(result).toBe(WorkflowState.RUNNING)
      })

      it('returns new state for running → succeeded', () => {
        const result = machine.transition(WorkflowState.RUNNING, WorkflowState.SUCCEEDED)
        expect(result).toBe(WorkflowState.SUCCEEDED)
      })

      it('returns new state for waiting_approval → running', () => {
        const result = machine.transition(WorkflowState.WAITING_APPROVAL, WorkflowState.RUNNING)
        expect(result).toBe(WorkflowState.RUNNING)
      })
    })

    describe('invalid transitions', () => {
      it('throws InvalidStateTransitionError for succeeded → running', () => {
        expect(() => machine.transition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)).toThrow(
          InvalidStateTransitionError
        )
      })

      it('throws InvalidStateTransitionError for queued → failed', () => {
        expect(() => machine.transition(WorkflowState.QUEUED, WorkflowState.FAILED)).toThrow(
          InvalidStateTransitionError
        )
      })

      it('throws InvalidStateTransitionError for failed → running', () => {
        expect(() => machine.transition(WorkflowState.FAILED, WorkflowState.RUNNING)).toThrow(
          InvalidStateTransitionError
        )
      })

      it('throws InvalidStateTransitionError for cancelled → running', () => {
        expect(() => machine.transition(WorkflowState.CANCELLED, WorkflowState.RUNNING)).toThrow(
          InvalidStateTransitionError
        )
      })

      it('error message includes from and to states', () => {
        expect(() => machine.transition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)).toThrow(
          'Cannot transition from succeeded to running'
        )
      })

      it('error has correct name property', () => {
        try {
          machine.transition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)
          expect.fail('Should have thrown')
        } catch (error: any) {
          expect(error.name).toBe('InvalidStateTransitionError')
        }
      })
    })
  })

  describe('isTerminal', () => {
    describe('terminal states', () => {
      it('returns true for SUCCEEDED', () => {
        expect(machine.isTerminal(WorkflowState.SUCCEEDED)).toBe(true)
      })

      it('returns true for FAILED', () => {
        expect(machine.isTerminal(WorkflowState.FAILED)).toBe(true)
      })

      it('returns true for CANCELLED', () => {
        expect(machine.isTerminal(WorkflowState.CANCELLED)).toBe(true)
      })
    })

    describe('non-terminal states', () => {
      it('returns false for QUEUED', () => {
        expect(machine.isTerminal(WorkflowState.QUEUED)).toBe(false)
      })

      it('returns false for RUNNING', () => {
        expect(machine.isTerminal(WorkflowState.RUNNING)).toBe(false)
      })

      it('returns false for WAITING_APPROVAL', () => {
        expect(machine.isTerminal(WorkflowState.WAITING_APPROVAL)).toBe(false)
      })
    })
  })

  describe('getValidNextStates', () => {
    it('returns all valid transitions from QUEUED', () => {
      const valid = machine.getValidNextStates(WorkflowState.QUEUED)
      expect(valid).toEqual([WorkflowState.RUNNING, WorkflowState.CANCELLED])
    })

    it('returns all valid transitions from RUNNING', () => {
      const valid = machine.getValidNextStates(WorkflowState.RUNNING)
      expect(valid).toEqual([
        WorkflowState.WAITING_APPROVAL,
        WorkflowState.SUCCEEDED,
        WorkflowState.FAILED,
        WorkflowState.CANCELLED,
      ])
    })

    it('returns all valid transitions from WAITING_APPROVAL', () => {
      const valid = machine.getValidNextStates(WorkflowState.WAITING_APPROVAL)
      expect(valid).toEqual([
        WorkflowState.RUNNING,
        WorkflowState.SUCCEEDED,
        WorkflowState.FAILED,
        WorkflowState.CANCELLED,
      ])
    })

    it('returns empty array for SUCCEEDED', () => {
      expect(machine.getValidNextStates(WorkflowState.SUCCEEDED)).toEqual([])
    })

    it('returns empty array for FAILED', () => {
      expect(machine.getValidNextStates(WorkflowState.FAILED)).toEqual([])
    })

    it('returns empty array for CANCELLED', () => {
      expect(machine.getValidNextStates(WorkflowState.CANCELLED)).toEqual([])
    })
  })

  describe('integration scenarios', () => {
    it('supports full lifecycle: queued → running → succeeded', () => {
      let state = WorkflowState.QUEUED
      state = machine.transition(state, WorkflowState.RUNNING)
      expect(state).toBe(WorkflowState.RUNNING)

      state = machine.transition(state, WorkflowState.SUCCEEDED)
      expect(state).toBe(WorkflowState.SUCCEEDED)
      expect(machine.isTerminal(state)).toBe(true)
    })

    it('supports approval workflow: queued → running → waiting_approval → running → succeeded', () => {
      let state = WorkflowState.QUEUED
      state = machine.transition(state, WorkflowState.RUNNING)
      state = machine.transition(state, WorkflowState.WAITING_APPROVAL)
      expect(state).toBe(WorkflowState.WAITING_APPROVAL)

      state = machine.transition(state, WorkflowState.RUNNING)
      expect(state).toBe(WorkflowState.RUNNING)

      state = machine.transition(state, WorkflowState.SUCCEEDED)
      expect(state).toBe(WorkflowState.SUCCEEDED)
      expect(machine.isTerminal(state)).toBe(true)
    })

    it('supports cancellation from queued', () => {
      const state = machine.transition(WorkflowState.QUEUED, WorkflowState.CANCELLED)
      expect(state).toBe(WorkflowState.CANCELLED)
      expect(machine.isTerminal(state)).toBe(true)
    })

    it('supports failure from running', () => {
      let state = WorkflowState.QUEUED
      state = machine.transition(state, WorkflowState.RUNNING)
      state = machine.transition(state, WorkflowState.FAILED)
      expect(state).toBe(WorkflowState.FAILED)
      expect(machine.isTerminal(state)).toBe(true)
    })
  })
})
