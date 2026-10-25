import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CustomConfigModule } from '@vyrak/custom-config'
import { CustomLoggerModule } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'

import { ClsModule } from 'nestjs-cls'

import { ExampleProcessor } from './processors'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CustomConfigModule,
    CustomLoggerModule,
    DatabaseModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: false },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'example',
    }),
    BullModule.registerQueue({
      name: 'workflow-execution',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [ExampleProcessor],
})
export class AppModule {}
