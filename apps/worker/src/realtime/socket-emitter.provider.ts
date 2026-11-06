import { Emitter } from '@socket.io/redis-emitter'
import { CONFIG_SERVICE } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { createClient } from 'redis'

import type { OnModuleDestroy, Provider } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'

export const SOCKET_EMITTER = Symbol('SOCKET_EMITTER')

/**
 * Socket.IO namespace of the api-server ChatGateway (`@WebSocketGateway({ namespace: '/chat' })`).
 */
export const CHAT_NAMESPACE = '/chat'

export interface ISocketEmitter {
  /** Send one event to a single connected socket, on whichever api instance holds it. */
  emitToSocket(socketId: string, event: string, payload: unknown): void
}

/**
 * Publishes Socket.IO events into Redis so the api-server instances deliver them to browsers.
 *
 * The api-server attaches `@socket.io/redis-adapter` (RedisIoAdapter) built from `redis.url`
 * with no `key` option, so its channel prefix is the default `socket.io`. This emitter
 * must use that same Redis URL and the same default `socket.io` prefix, plus the `/chat`
 * namespace, or events are published to a channel nobody listens on and no error is raised.
 */
export class RedisSocketEmitter implements ISocketEmitter, OnModuleDestroy {
  private readonly chatNamespace: Emitter

  constructor(
    emitter: Emitter,
    private readonly redisClient: { readonly isOpen: boolean; quit(): Promise<unknown> }
  ) {
    this.chatNamespace = emitter.of(CHAT_NAMESPACE)
  }

  emitToSocket(socketId: string, event: string, payload: unknown): void {
    this.chatNamespace.to(socketId).emit(event, payload)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit()
    }
  }
}

export const socketEmitterProvider: Provider = {
  provide: SOCKET_EMITTER,
  inject: [CONFIG_SERVICE, EnhancedLogger],
  useFactory: async (configService: IConfigService, logger: EnhancedLogger): Promise<RedisSocketEmitter> => {
    const client = createClient({ url: configService.redis.url })
    client.on('error', (error: Error) => logger.error(error, 'Socket emitter Redis error', 'SocketEmitter'))
    await client.connect()
    return new RedisSocketEmitter(new Emitter(client), client)
  },
}
