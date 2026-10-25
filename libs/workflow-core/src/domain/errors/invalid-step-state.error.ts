/**
 * Domain error for invalid step state
 */
export class InvalidStepStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStepStateError'
  }
}
