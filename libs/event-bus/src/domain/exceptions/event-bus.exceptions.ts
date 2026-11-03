/**
 * Base exception for event bus errors
 */
export class EventBusError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventBusError'
  }
}

/**
 * Thrown when event bus connection fails
 */
export class EventBusConnectionError extends EventBusError {
  constructor(message: string) {
    super(message)
    this.name = 'EventBusConnectionError'
  }
}

/**
 * Thrown when event publishing fails
 */
export class EventPublishError extends EventBusError {
  constructor(
    public readonly event: string,
    message: string
  ) {
    super(message)
    this.name = 'EventPublishError'
  }
}

/**
 * Thrown when event subscription fails
 */
export class EventSubscribeError extends EventBusError {
  constructor(
    public readonly event: string,
    message: string
  ) {
    super(message)
    this.name = 'EventSubscribeError'
  }
}
