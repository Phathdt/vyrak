import Redis from 'ioredis'

import type { EventHandler, IEventBus, SubscribeOptions } from '../../domain/interfaces/event-bus.interface'
import type { OnModuleDestroy } from '@nestjs/common'

/**
 * Redis Streams implementation of IEventBus
 */
export class RedisEventBus implements IEventBus, OnModuleDestroy {
  private redis: Redis
  private subscriptions: Map<string, boolean> = new Map()
  private logger = {
    log: (message: string) => console.log(`[RedisEventBus] ${message}`),
    warn: (message: string) => console.warn(`[RedisEventBus] ${message}`),
    error: (message: string, error?: unknown) => console.error(`[RedisEventBus] ${message}`, error ? error : ''),
  }

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError(err) {
        const targetError = 'READONLY'
        if (err.message.includes(targetError)) {
          return true // Reconnect
        }
        return false
      },
    })

    this.redis.on('error', (error) => {
      this.logger.error('Connection error:', error)
    })

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis')
    })

    this.redis.on('reconnecting', () => {
      this.logger.warn('Reconnecting to Redis...')
    })
  }

  /**
   * NestJS lifecycle hook - cleanup on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Module destroying, cleaning up subscriptions...')
    await this.close()
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
      this.logger.error(`Failed to publish event ${event}:`, error)
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
      this.logger.warn(`Already subscribed to ${event} with group ${group}`)
      return
    }
    this.subscriptions.set(subscriptionKey, true)

    // Start consuming in background
    this.consumeStream(streamKey, group, consumer, count, block, handler).catch((error) => {
      this.logger.error(`Consumer error for ${event}:`, error)
      this.subscriptions.delete(subscriptionKey)
    })
  }

  /**
   * Unsubscribe from an event stream
   */
  async unsubscribe(event: string, group?: string, consumer?: string): Promise<void> {
    const streamKey = `events:${event}`
    const groupName = group || 'default-workers'
    const consumerName = consumer || `worker-${process.pid}`

    const subscriptionKey = `${streamKey}:${groupName}:${consumerName}`
    this.subscriptions.delete(subscriptionKey)

    this.logger.log(`Unsubscribed from ${event}`)
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
        this.logger.error(`Failed to create consumer group ${group}:`, error)
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
    handler: EventHandler<T>,
    maxRetries: number = 3
  ): Promise<void> {
    const subscriptionKey = `${stream}:${group}:${consumer}`
    let retryCount = 0

    while (this.subscriptions.get(subscriptionKey)) {
      // Check if subscription still active
      if (!this.subscriptions.get(subscriptionKey)) {
        break
      }

      // Check Redis connection state
      if (this.redis.status !== 'ready') {
        this.logger.warn(`Redis not ready (${this.redis.status}), waiting...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

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

        // Reset retry count on successful read
        retryCount = 0

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
                this.logger.warn(`Invalid message format for ${id}`)
                await this.redis.xack(stream, group, id)
                continue
              }

              const payload = JSON.parse(fields[dataIndex + 1] as string) as T

              // Handle event
              await handler(payload)

              // Acknowledge message on success
              await this.redis.xack(stream, group, id)
            } catch (error) {
              this.logger.error(`Failed to process message ${id}:`, error)

              // Check retry count
              const messageRetryCount = await this.getRetryCount(stream, group, id)

              if (messageRetryCount >= maxRetries) {
                // Move to DLQ
                await this.moveToDLQ(stream, group, id, fields, error)
                await this.redis.xack(stream, group, id)
                this.logger.error(`Message ${id} moved to DLQ after ${messageRetryCount} retries`)
              } else {
                // Increment retry count and don't ack (will be retried)
                await this.incrementRetryCount(stream, group, id)
                this.logger.warn(`Message ${id} will retry (attempt ${messageRetryCount + 1}/${maxRetries})`)
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error reading from stream ${stream}:`, error)

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
        await new Promise((resolve) => setTimeout(resolve, delay))
        retryCount++
      }
    }

    this.logger.log(`Stopped consuming from ${stream}`)
  }

  /**
   * Get retry count for a message
   */
  private async getRetryCount(stream: string, group: string, messageId: string): Promise<number> {
    const key = `retry:${stream}:${group}:${messageId}`
    const count = await this.redis.get(key)
    return count ? parseInt(count, 10) : 0
  }

  /**
   * Increment retry count for a message
   */
  private async incrementRetryCount(stream: string, group: string, messageId: string): Promise<void> {
    const key = `retry:${stream}:${group}:${messageId}`
    await this.redis.incr(key)
    await this.redis.expire(key, 86400) // 24 hours TTL
  }

  /**
   * Move message to dead letter queue
   */
  private async moveToDLQ(
    stream: string,
    group: string,
    messageId: string,
    fields: string[],
    error: unknown
  ): Promise<void> {
    const dlqStream = `${stream}:dlq`

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack || '' : ''

    await this.redis.xadd(
      dlqStream,
      '*',
      ...fields,
      'original_id',
      messageId,
      'error',
      errorMessage,
      'error_stack',
      errorStack,
      'moved_at',
      Date.now().toString()
    )

    this.logger.log(`Moved message ${messageId} from group ${group} to DLQ: ${dlqStream}`)
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    this.logger.log('Closing Redis connection...')

    // Stop all subscriptions
    this.subscriptions.clear()

    // Close Redis connection
    await this.redis.quit()
    this.logger.log('Connection closed')
  }
}
