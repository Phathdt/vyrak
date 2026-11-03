/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => Promise<void>

/**
 * Event bus interface for publishing and subscribing to events
 */
export interface IEventBus {
  /**
   * Publish an event to the event bus
   * @param event - Event name (e.g., 'agent.tool_use')
   * @param data - Event payload
   */
  publish(event: string, data: unknown): Promise<void>

  /**
   * Subscribe to an event stream with a handler
   * @param event - Event name to subscribe to
   * @param handler - Function to handle the event
   * @param options - Subscription options
   */
  subscribe<T = unknown>(event: string, handler: EventHandler<T>, options?: SubscribeOptions): Promise<void>

  /**
   * Create a consumer group for an event stream
   * @param stream - Stream name
   * @param group - Consumer group name
   */
  createConsumerGroup(stream: string, group: string): Promise<void>

  /**
   * Close the event bus connection
   */
  close(): Promise<void>
}

/**
 * Options for subscribing to events
 */
export interface SubscribeOptions {
  /**
   * Consumer group name
   * If not provided, will use default group
   */
  group?: string

  /**
   * Consumer name within the group
   * If not provided, will generate a unique name
   */
  consumer?: string

  /**
   * Number of events to read at once
   * @default 10
   */
  count?: number

  /**
   * Block time in milliseconds when no events available
   * @default 1000
   */
  block?: number
}
