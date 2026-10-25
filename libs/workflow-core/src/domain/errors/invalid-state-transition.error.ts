/**
 * Domain error for invalid state transitions
 */
export class InvalidStateTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStateTransitionError'
  }
}
