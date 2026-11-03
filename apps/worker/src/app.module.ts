import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AI_AGENT_SERVICE, AIAgentModule, IAIAgentService } from '@vyrak/ai-agent'
import { ARTIFACT_SERVICE, ArtifactModule, IArtifactService } from '@vyrak/artifact'
import { ConversationModule } from '@vyrak/conversation'
import { CONFIG_SERVICE, CustomConfigModule, IConfigService } from '@vyrak/custom-config'
import { CustomLoggerModule, EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { EventBusModule } from '@vyrak/event-bus'
import {
  SubTaskPrismaRepository,
  WorkflowCoreModule,
  WorkflowDependencyPrismaRepository,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
} from '@vyrak/workflow-core'
import {
  CODE_REVIEW_SERVICE,
  CodeReviewService,
  IMPLEMENTATION_ORCHESTRATION_SERVICE,
  ImplementationOrchestrationService,
  QA_VERIFICATION_SERVICE,
  QAVerificationService,
} from '@vyrak/workflow-execution'
import { ClsModule } from 'nestjs-cls'

import {
  ExampleProcessor,
  WorkflowPhaseRunProcessor,
  ArtifactCreationProcessor,
  MessageStoreProcessor,
  PhaseTransitionProcessor,
} from './processors'

// TODO: WorkflowExecutionProcessor temporarily disabled
// Epic 3 only implements agent integration (AgentStepExecutor)
// WorkflowExecutionProcessor needs workflow-executor service which will be implemented in Epic 2
// import { WorkflowExecutionProcessor } from './processors'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CustomConfigModule,
    CustomLoggerModule,
    DatabaseModule,
    EventBusModule,
    ArtifactModule,
    ConversationModule,
    AIAgentModule,
    WorkflowCoreModule,
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
  providers: [
    ExampleProcessor,
    WorkflowPhaseRunProcessor,
    ArtifactCreationProcessor,
    MessageStoreProcessor,
    PhaseTransitionProcessor,
    {
      provide: IMPLEMENTATION_ORCHESTRATION_SERVICE,
      useFactory: (
        databaseService: DatabaseService,
        artifactService: IArtifactService,
        aiAgentService: IAIAgentService,
        configService: IConfigService,
        logger: EnhancedLogger
      ) =>
        new ImplementationOrchestrationService(
          new SubTaskPrismaRepository(databaseService),
          new WorkflowDependencyPrismaRepository(databaseService),
          new WorkflowPrismaRepository(databaseService),
          artifactService,
          aiAgentService,
          configService,
          logger,
          3
        ),
      inject: [DatabaseService, ARTIFACT_SERVICE, AI_AGENT_SERVICE, CONFIG_SERVICE, EnhancedLogger],
    },
    {
      provide: CODE_REVIEW_SERVICE,
      useFactory: (
        databaseService: DatabaseService,
        artifactService: IArtifactService,
        aiAgentService: IAIAgentService,
        configService: IConfigService,
        logger: EnhancedLogger
      ) =>
        new CodeReviewService(
          new WorkflowPrismaRepository(databaseService),
          new WorkflowPhasePrismaRepository(databaseService),
          artifactService,
          aiAgentService,
          configService,
          logger
        ),
      inject: [DatabaseService, ARTIFACT_SERVICE, AI_AGENT_SERVICE, CONFIG_SERVICE, EnhancedLogger],
    },
    {
      provide: QA_VERIFICATION_SERVICE,
      useFactory: (
        databaseService: DatabaseService,
        artifactService: IArtifactService,
        aiAgentService: IAIAgentService,
        configService: IConfigService,
        logger: EnhancedLogger
      ) =>
        new QAVerificationService(
          new WorkflowPrismaRepository(databaseService),
          artifactService,
          aiAgentService,
          configService,
          logger
        ),
      inject: [DatabaseService, ARTIFACT_SERVICE, AI_AGENT_SERVICE, CONFIG_SERVICE, EnhancedLogger],
    },
  ],
})
export class AppModule {}
