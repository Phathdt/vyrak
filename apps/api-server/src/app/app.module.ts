import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from '@vyrak/auth'
import { CustomConfigModule } from '@vyrak/custom-config'
import { CustomLoggerModule } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'
import { OrganizationModule } from '@vyrak/organization'
import { ProjectModule } from '@vyrak/project'
import { UserModule } from '@vyrak/user'
import { WorkflowModule } from '@vyrak/workflow'

import { ResponseInterceptor, TenantContextInterceptor, TraceIdInterceptor } from '../interceptors'
import { WorkflowBrainstormingController } from '../workflow/workflow-brainstorming.controller'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import {
  AuthController,
  InvitationsController,
  OrganizationsController,
  ProjectsController,
  WorkflowsController,
} from './controllers'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CustomConfigModule,
    CustomLoggerModule,
    CacheModule.register({ isGlobal: true }),
    DatabaseModule,
    ScheduleModule.forRoot(),
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
    AuthModule,
    UserModule,
    OrganizationModule,
    ProjectModule,
    WorkflowModule,
  ],
  controllers: [
    AppController,
    AuthController,
    OrganizationsController,
    InvitationsController,
    ProjectsController,
    WorkflowsController,
    WorkflowBrainstormingController,
  ],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
