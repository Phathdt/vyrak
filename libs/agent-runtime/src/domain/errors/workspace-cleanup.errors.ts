/**
 * Workspace cleanup error
 *
 * Thrown when workspace cleanup operations fail
 */
export class WorkspaceCleanupError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'WorkspaceCleanupError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkspaceCleanupError)
    }
  }
}
