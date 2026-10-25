import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidStateTransitionError } from '../../domain/errors/invalid-state-transition.error'
import {
  WorkflowState,
  WorkflowStateMachine,
} from '../../domain/workflow-state'

describe('WorkflowStateMachine', () => {
  let machine: WorkflowStateMachine

  beforeEach(() => {
    machine = new WorkflowStateMachine()
  })

  describe('canTransition', () => {
    describe('from QUEUED', () => {
      it('allows queued → running', () => {
        expect(
          machine.canTransition(WorkflowState.QUEUED, WorkflowState.RUNNING)
        ).toBe(true)
      })

      it('allows queued → cancelled', () => {
        expect(
          machine.canTransition(WorkflowState.QUEUED, WorkflowState.CANCELLED)
        ).toBe(true)
      })

      it('rejects queued → failed', () => {
        expect(
          machine.canTransition(WorkflowState.QUEUED, WorkflowState.FAILED)
        ).toBe(false)
      })

      it('rejects queued → succeeded', () => {
        expect(
          machine.canTransition(WorkflowState.QUEUED, WorkflowState.SUCCEEDED)
        ).toBe(false)
      })

      it('rejects queued → waiting_approval', () => {
        expect(
          machine.canTransition(
            WorkflowState.QUEUED,
            WorkflowState.WAITING_APPROVAL
          )
        ).toBe(false)
      })
    })

    describe('from RUNNING', () => {
      it('allows running → waiting_approval', () => {
        expect(
          machine.canTransition(
            WorkflowState.RUNNING,
            WorkflowState.WAITING_APPROVAL
          )
        ).toBe(true)
      })

      it('allows running → succeeded', () => {
        expect(
          machine.canTransition(WorkflowState.RUNNING, WorkflowState.SUCCEEDED)
        ).toBe(true)
      })

      it('allows running → failed', () => {
        expect(
          machine.canTransition(WorkflowState.RUNNING, WorkflowState.FAILED)
        ).toBe(true)
      })

      it('allows running → cancelled', () => {
        expect(
          machine.canTransition(WorkflowState.RUNNING, WorkflowState.CANCELLED)
        ).toBe(true)
      })

      it('rejects running → queued', () => {
        expect(
          machine.canTransition(WorkflowState.RUNNING, WorkflowState.QUEUED)
        ).toBe(false)
      })
    })

    describe('from WAITING_APPROVAL', () => {
      it('allows waiting_approval → running', () => {
        expect(
          machine.canTransition(
            WorkflowState.WAITING_APPROVAL,
            WorkflowState.RUNNING
          )
        ).toBe(true)
      })

      it('allows waiting_approval → succeeded', () => {
        expect(
          machine.canTransition(
            WorkflowState.WAITING_APPROVAL,
            WorkflowState.SUCCEEDED
          )
        ).toBe(true)
      })

      it('allows waiting_approval → failed', () => {
        expect(
          machine.canTransition(
            WorkflowState.WAITING_APPROVAL,
            WorkflowState.FAILED
          )
        ).toBe(true)
      })

      it('allows waiting_approval → cancelled', () => {
        expect(
          machine.canTransition(
            WorkflowState.WAITING_APPROVAL,
            WorkflowState.CANCELLED
          )
        ).toBe(true)
      })

      it('rejects waiting_approval → queued', () => {
        expect(
          machine.canTransition(
            WorkflowState.WAITING_APPROVAL,
            WorkflowState.QUEUED
          )
        ).toBe(false)
      })
    })

    describe('from terminal states', () => {
      it('rejects all transitions from SUCCEEDED', () => {
        expect(
          machine.canTransition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)
        ).toBe(false)
        expect(
          machine.canTransition(WorkflowState.SUCCEEDED, WorkflowState.QUEUED)
        ).toBe(false)
        expect(
          machine.canTransition(WorkflowState.SUCCEEDED, WorkflowState.FAILED)
        ).toBe(false)
      })

      it('rejects all transitions from FAILED', () => {
        expect(
          machine.canTransition(WorkflowState.FAILED, WorkflowState.RUNNING)
        ).toBe(false)
        expect(
          machine.canTransition(WorkflowState.FAILED, WorkflowState.QUEUED)
        ).toBe(false)
        expect(
          machine.canTransition(WorkflowState.FAILED, WorkflowState.SUCCEEDED)
        ).toBe(false)
      })

      it('rejects all transitions from CANCELLED', () => {
        expect(
          machine.canTransition(WorkflowState.CANCELLED, WorkflowState.RUNNING)
        ).toBe(false)
        expect(
          machine.canTransition(WorkflowState.CANCELLED, WorkflowState.QUEUED)
        ).toBe(false)
        expect(
          machine.canTransition(
            WorkflowState.CANCELLED,
            WorkflowState.SUCCEEDED
          )
        ).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('returns false for null from state', () => {
        expect(machine.canTransition(null as any, WorkflowState.RUNNING)).toBe(
          false
        )
      })

      it('returns false for null to state', () => {
        expect(machine.canTransition(WorkflowState.QUEUED, null as any)).toBe(
          false
        )
      })

      it('returns false for undefined from state', () => {
        expect(
          machine.canTransition(undefined as any, WorkflowState.RUNNING)
        ).toBe(false)
      })

      it('returns false for undefined to state', () => {
        expect(
          machine.canTransition(WorkflowState.QUEUED, undefined as any)
        ).toBe(false)
      })
    })
  })

  describe('transition', () => {
    it('returns new state on valid transition', () => {
      const result = machine.transition(
        WorkflowState.QUEUED,
        WorkflowState.RUNNING
      )
      expect(result).toBe(WorkflowState.RUNNING)
    })

    it('throws InvalidStateTransitionError on invalid transition', () => {
      expect(() =>
        machine.transition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)
      ).toThrow(InvalidStateTransitionError)
    })

    it('error message includes from and to states', () => {
      try {
        machine.transition(WorkflowState.SUCCEEDED, WorkflowState.RUNNING)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStateTransitionError)
        expect((error as Error).message).toContain('succeeded')
        expect((error as Error).message).toContain('running')
      }
    })

    it('allows complete workflow lifecycle', () => {
      let state = WorkflowState.QUEUED
      state = machine.transition(state, WorkflowState.RUNNING)
      expect(state).toBe(WorkflowState.RUNNING)

      state = machine.transition(state, WorkflowState.WAITING_APPROVAL)
      expect(state).toBe(WorkflowState.WAITING_APPROVAL)

      state = machine.transition(state, WorkflowState.RUNNING)
      expect(state).toBe(WorkflowState.RUNNING)

      state = machine.transition(state, WorkflowState.SUCCEEDED)
      expect(state).toBe(WorkflowState.SUCCEEDED)
    })
  })

  describe('isTerminal', () => {
    it('returns true for SUCCEEDED', () => {
      expect(machine.isTerminal(WorkflowState.SUCCEEDED)).toBe(true)
    })

    it('returns true for FAILED', () => {
      expect(machine.isTerminal(WorkflowState.FAILED)).toBe(true)
    })

    it('returns true for CANCELLED', () => {
      expect(machine.isTerminal(WorkflowState.CANCELLED)).toBe(true)
    })

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

  describe('getValidNextStates', () => {
    it('returns correct transitions from QUEUED', () => {
      const valid = machine.getValidNextStates(WorkflowState.QUEUED)
      expect(valid).toEqual([WorkflowState.RUNNING, WorkflowState.CANCELLED])
    })

    it('returns correct transitions from RUNNING', () => {
      const valid = machine.getValidNextStates(WorkflowState.RUNNING)
      expect(valid).toEqual([
        WorkflowState.WAITING_APPROVAL,
        WorkflowState.SUCCEEDED,
        WorkflowState.FAILED,
        WorkflowState.CANCELLED,
      ])
    })

    it('returns correct transitions from WAITING_APPROVAL', () => {
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

  describe('InvalidStateTransitionError', () => {
    it('has correct name', () => {
      const error = new InvalidStateTransitionError('Test message')
      expect(error.name).toBe('InvalidStateTransitionError')
    })

    it('has correct message', () => {
      const error = new InvalidStateTransitionError('Test message')
      expect(error.message).toBe('Test message')
    })

    it('is instance of Error', () => {
      const error = new InvalidStateTransitionError('Test message')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
