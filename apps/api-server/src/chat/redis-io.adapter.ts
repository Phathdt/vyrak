import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient, RedisClientType } from 'redis'
import { ServerOptions, Server } from 'socket.io'

import type { INestApplicationContext } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'

/**
 * Redis-enabled Socket.IO adapter for NestJS
 * Allows horizontal scaling of WebSocket connections
 *
 * SECURITY: Properly manages Redis client lifecycle to prevent memory leaks
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined
  private pubClient: RedisClientType | undefined
  private subClient: RedisClientType | undefined

  constructor(
    app: INestApplicationContext,
    private readonly configService: IConfigService
  ) {
    super(app)
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = this.configService.redis.url
    console.log(`[RedisIoAdapter] Connecting to Redis: ${redisUrl}`)

    this.pubClient = createClient({ url: redisUrl })
    this.subClient = this.pubClient.duplicate()

    await Promise.all([this.pubClient.connect(), this.subClient.connect()])

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient)
    console.log('[RedisIoAdapter] Redis adapter configured successfully')
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options)

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor)
      console.log('[RedisIoAdapter] Redis adapter attached to Socket.IO server')
    } else {
      console.warn('[RedisIoAdapter] No Redis adapter available, running in single instance mode')
    }

    return server
  }

  /**
   * Close Redis connections to prevent memory leaks (CRITICAL FIX)
   */
  async close(): Promise<void> {
    console.log('[RedisIoAdapter] Closing Redis connections...')

    try {
      if (this.pubClient) {
        await this.pubClient.quit()
        console.log('[RedisIoAdapter] Pub client closed')
      }
    } catch (error) {
      console.error('[RedisIoAdapter] Error closing pub client:', error)
    }

    try {
      if (this.subClient) {
        await this.subClient.quit()
        console.log('[RedisIoAdapter] Sub client closed')
      }
    } catch (error) {
      console.error('[RedisIoAdapter] Error closing sub client:', error)
    }

    console.log('[RedisIoAdapter] Redis clients closed successfully')
  }
}
