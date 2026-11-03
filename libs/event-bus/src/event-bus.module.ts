import { Module } from '@nestjs/common'
import { CONFIG_SERVICE, CustomConfigModule } from '@vyrak/custom-config'

import { EVENT_BUS } from './infras/di/di'
import { RedisEventBus } from './infras/repositories/redis-event-bus.repository'

import type { IConfigService } from '@vyrak/custom-config'

/**
 * Event Bus module for NestJS
 * Provides EVENT_BUS dependency injection token
 */
@Module({
  imports: [CustomConfigModule],
  providers: [
    {
      provide: EVENT_BUS,
      useFactory: (config: IConfigService) => {
        const redisUrl = config.redis.url
        return new RedisEventBus(redisUrl)
      },
      inject: [CONFIG_SERVICE],
    },
  ],
  exports: [EVENT_BUS],
})
export class EventBusModule {}
