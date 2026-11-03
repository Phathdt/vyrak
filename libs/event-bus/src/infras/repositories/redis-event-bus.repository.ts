import Redis from 'ioredis'

import type { EventHandler, IEventBus, SubscribeOptions } from '../../domain/interfaces/event-bus.interface'

/**
 * Redis Streams implementation of IEventBus
 */
export class RedisEventBus implements IEventBus {
  private redis: Redis
  private subscriptions: Map<string, boolean> = new Map()

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    this.redis.on('error', (error) => {
      console.error('[RedisEventBus] Connection error:', error)
    })

    this.redis.on('connect', () => {
      console.log('[RedisEventBus] Connected to Redis')
    })
  }

  /**
   * Publish event to Redis Stream
   */
  async publish(event: string, data: unknown): Promise<void> {
    const streamKey = `events:${event}`
    const payload = JSON.stringify(data)

    try {
      await this.redis.xadd(streamKey, '*', 'data', payload, 'timestamp', Date.now().toString())
    } catch (error) {
      console.error(`[RedisEventBus] Failed to publish event ${event}:`, error)
      throw error
    }
  }

  /**
   * Subscribe to event stream with consumer group
   */
  async subscribe<T = unknown>(event: string, handler: EventHandler<T>, options?: SubscribeOptions): Promise<void> {
    const streamKey = `events:${event}`
    const group = options?.group || 'default-workers'
    const consumer = options?.consumer || `worker-${process.pid}-${Math.random().toString(36).slice(2, 9)}`
    const count = options?.count || 10
    const block = options?.block || 1000

    // Create consumer group if not exists
    await this.createConsumerGroup(streamKey, group)

    // Mark this subscription as active
    const subscriptionKey = `${streamKey}:${group}:${consumer}`
    if (this.subscriptions.has(subscriptionKey)) {
      console.warn(`[RedisEventBus] Already subscribed to ${event} with group ${group}`)
      return
    }
    this.subscriptions.set(subscriptionKey, true)

    // Start consuming in background
    this.consumeStream(streamKey, group, consumer, count, block, handler).catch((error) => {
      console.error(`[RedisEventBus] Consumer error for ${event}:`, error)
      this.subscriptions.delete(subscriptionKey)
    })
  }

  /**
   * Create consumer group for stream
   */
  async createConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM')
    } catch (error: unknown) {
      // Ignore error if group already exists
      if (error instanceof Error && !error.message.includes('BUSYGROUP')) {
        console.error(`[RedisEventBus] Failed to create consumer group ${group}:`, error)
        throw error
      }
    }
  }

  /**
   * Consume events from stream using XREADGROUP
   */
  private async consumeStream<T>(
    stream: string,
    group: string,
    consumer: string,
    count: number,
    block: number,
    handler: EventHandler<T>
  ): Promise<void> {
    const subscriptionKey = `${stream}:${group}:${consumer}`

    while (this.subscriptions.get(subscriptionKey)) {
      try {
        // Read from stream
        const results = (await this.redis.xreadgroup(
          'GROUP',
          group,
          consumer,
          'COUNT',
          count.toString(),
          'BLOCK',
          block.toString(),
          'STREAMS',
          stream,
          '>'
        )) as [string, [string, string[]][]][] | null

        if (!results || results.length === 0) {
          continue
        }

        // Process messages
        for (const [, messages] of results) {
          for (const [id, fields] of messages) {
            try {
              // Parse payload
              const dataIndex = fields.indexOf('data')
              if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
                console.warn(`[RedisEventBus] Invalid message format for ${id}`)
                continue
              }

              const payload = JSON.parse(fields[dataIndex + 1] as string) as T

              // Handle event
              await handler(payload)

              // Acknowledge message
              await this.redis.xack(stream, group, id)
            } catch (error) {
              console.error(`[RedisEventBus] Failed to process message ${id}:`, error)
              // Don't acknowledge - will be retried
            }
          }
        }
      } catch (error) {
        console.error(`[RedisEventBus] Error reading from stream ${stream}:`, error)
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`[RedisEventBus] Stopped consuming from ${stream}`)
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    // Stop all subscriptions
    this.subscriptions.clear()

    // Close Redis connection
    await this.redis.quit()
    console.log('[RedisEventBus] Connection closed')
  }
}
