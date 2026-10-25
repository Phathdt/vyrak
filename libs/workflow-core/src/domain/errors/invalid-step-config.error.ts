/**
 * Domain error for invalid step configuration
 */
export class InvalidStepConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStepConfigError'
  }
}
