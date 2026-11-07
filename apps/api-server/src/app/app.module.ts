import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { ArtifactModule } from '@vyrak/artifact'
import { AuthModule } from '@vyrak/auth'
import { CONFIG_SERVICE, CustomConfigModule, IConfigService, parseRedisUrl } from '@vyrak/custom-config'
import { CustomLoggerModule } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'
import { EventBusModule } from '@vyrak/event-bus'
import { GitHubAuthModule } from '@vyrak/github-auth'
import { OrganizationModule } from '@vyrak/organization'
import { ProjectModule } from '@vyrak/project'
import { UserModule } from '@vyrak/user'
import { WorkflowCoreModule } from '@vyrak/workflow-core'
import { WorkflowExecutionModule } from '@vyrak/workflow-execution'
import { WorkflowPlanningModule } from '@vyrak/workflow-planning'

import { ArtifactsController } from '../artifacts/artifacts.controller'
import { ChatModule } from '../chat/chat.module'
import { DomainExceptionFilter } from '../common/filters'
import { OrganizationMemberGuard } from '../guards'
import { ResponseInterceptor, TenantContextInterceptor, TraceIdInterceptor } from '../interceptors'
import { WorkflowExecutionController } from '../workflow/workflow-execution.controller'
// Brainstorming disabled for MVP - will be re-enabled later
// import { WorkflowBrainstormingController } from '../workflow/workflow-brainstorming.controller'
import {
  workflowPhaseAutomationImports,
  workflowPhaseAutomationProviders,
} from '../workflow/workflow-phase-automation.providers'
import { WorkflowPlanningController } from '../workflow/workflow-planning.controller'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import {
  AuthController,
  InvitationsController,
  OrganizationsController,
  ProjectsController,
  RepositoriesController,
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per TTL window
      },
    ]),
    BullModule.forRootAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: IConfigService) => ({
        connection: parseRedisUrl(configService.redis.url),
      }),
    }),
    BullModule.registerQueue({
      name: 'example',
    }),
    ...workflowPhaseAutomationImports,
    EventBusModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    GitHubAuthModule,
    ProjectModule,
    ArtifactModule,
    WorkflowCoreModule,
    // Brainstorming disabled for MVP - will be re-enabled later
    // WorkflowBrainstormingModule,
    WorkflowPlanningModule,
    WorkflowExecutionModule,
    ChatModule,
  ],
  controllers: [
    AppController,
    AuthController,
    OrganizationsController,
    InvitationsController,
    ProjectsController,
    RepositoriesController,
    WorkflowsController,
    ArtifactsController,
    // Brainstorming disabled for MVP - will be re-enabled later
    // WorkflowBrainstormingController,
    WorkflowPlanningController,
    WorkflowExecutionController,
  ],
  providers: [
    AppService,
    ...workflowPhaseAutomationProviders,
    OrganizationMemberGuard,
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
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
