/**
 * Main repository error
 *
 * Thrown when main repository operations fail
 */
export class MainRepoError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'MainRepoError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MainRepoError)
    }
  }
}
