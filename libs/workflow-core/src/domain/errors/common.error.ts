/**
 * Domain-level validation error
 * Thrown when input data fails validation rules
 */
export class ValidationException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationException'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationException)
    }
  }
}

/**
 * Resource not found error
 */
export class NotFoundException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundException'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundException)
    }
  }
}

/**
 * Authorization/permission denied error
 */
export class UnauthorizedException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedException'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedException)
    }
  }
}

/**
 * Queue operation failure error
 */
export class QueueException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueueException'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueueException)
    }
  }
}

/**
 * Step run not found error
 */
export class StepNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StepNotFoundError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StepNotFoundError)
    }
  }
}

/**
 * Base workflow error
 */
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowError)
    }
  }
}

/**
 * Workflow not found error
 */
export class WorkflowNotFoundError extends WorkflowError {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowNotFoundError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowNotFoundError)
    }
  }
}

/**
 * Workflow already exists error (idempotency key conflict)
 */
export class WorkflowAlreadyExistsError extends WorkflowError {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowAlreadyExistsError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowAlreadyExistsError)
    }
  }
}

/**
 * Workflow repository operation error
 */
export class WorkflowRepositoryError extends WorkflowError {
  constructor(
    message: string,
    public readonly cause?: string
  ) {
    super(message)
    this.name = 'WorkflowRepositoryError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkflowRepositoryError)
    }
  }
}
