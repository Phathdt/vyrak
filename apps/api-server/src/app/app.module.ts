import { BullModule } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { ArtifactModule } from '@vyrak/artifact'
import { AuthModule } from '@vyrak/auth'
import { CustomConfigModule } from '@vyrak/custom-config'
import { CustomLoggerModule } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'
import { OrganizationModule } from '@vyrak/organization'
import { ProjectModule } from '@vyrak/project'
import { UserModule } from '@vyrak/user'
import { WorkflowCoreModule } from '@vyrak/workflow-core'
import { WorkflowExecutionModule } from '@vyrak/workflow-execution'
import { WorkflowPlanningModule } from '@vyrak/workflow-planning'

import { ArtifactsController } from '../artifacts/artifacts.controller'
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
import { WorkflowPlanningSSEController } from '../workflow/workflow-planning-sse.controller'
import { WorkflowPlanningController } from '../workflow/workflow-planning.controller'
import { WorkflowTechRefinementSSEController } from '../workflow/workflow-tech-refinement-sse.controller'
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
    ...workflowPhaseAutomationImports,
    AuthModule,
    UserModule,
    OrganizationModule,
    ProjectModule,
    ArtifactModule,
    WorkflowCoreModule,
    // Brainstorming disabled for MVP - will be re-enabled later
    // WorkflowBrainstormingModule,
    WorkflowPlanningModule,
    WorkflowExecutionModule,
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
    WorkflowPlanningSSEController,
    WorkflowTechRefinementSSEController,
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
