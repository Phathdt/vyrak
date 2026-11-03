/**
 * Enriched error with event context for better DLQ debugging
 */
export class WorkerProcessingError extends Error {
  constructor(
    message: string,
    public readonly context: {
      processor: string
      eventType: string
      workflowId?: string
      phaseId?: string
      orgId?: string
      projectId?: string
      originalError?: Error
      [key: string]: unknown
    }
  ) {
    super(message)
    this.name = 'WorkerProcessingError'

    // Include original error stack if available
    if (context.originalError) {
      this.stack = `${this.stack}\n\nCaused by: ${context.originalError.stack}`
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      stack: this.stack,
    }
  }
}
