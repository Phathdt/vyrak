import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AI_AGENT_SERVICE, AI_AGENT_STREAM_PORT, IAgentStreamPort, IAIAgentService } from '@vyrak/ai-agent'
import { AIAgentSdkModule } from '@vyrak/ai-agent-sdk'
import { ARTIFACT_SERVICE, ArtifactModule, IArtifactService } from '@vyrak/artifact'
import { CONVERSATION_SERVICE, ConversationModule, IConversationService } from '@vyrak/conversation'
import { CONFIG_SERVICE, CustomConfigModule, IConfigService, parseRedisUrl } from '@vyrak/custom-config'
import { CustomLoggerModule, EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { EventBusModule } from '@vyrak/event-bus'
import {
  IWorkflowRepository,
  IGitHubAuthService,
  GITHUB_AUTH_SERVICE,
  RepositoryContextService,
  SubTaskPrismaRepository,
  WORKFLOW_REPOSITORY,
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
import { CHAT_TURN_QUEUE, CHAT_TURN_SERVICE, ChatTurnService } from '@vyrak/workflow-planning'
import { ClsModule } from 'nestjs-cls'

import { AppController } from './app.controller'
import {
  ChatTurnProcessor,
  ExampleProcessor,
  WorkflowPhaseRunProcessor,
  ArtifactCreationProcessor,
  MessageStoreProcessor,
  PhaseTransitionProcessor,
} from './processors'
import { socketEmitterProvider } from './realtime/socket-emitter.provider'

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
    AIAgentSdkModule,
    WorkflowCoreModule,
    ClsModule.forRoot({
      global: true,
      middleware: { mount: false },
    }),
    BullModule.forRootAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: IConfigService) => ({
        connection: parseRedisUrl(configService.redis.url),
      }),
    }),
    BullModule.registerQueue({
      name: 'example',
    }),
    // Separate queue so long implementation jobs never block chat. attempts: 1 because a retried
    // turn would stream a second answer after part of the first was already delivered.
    BullModule.registerQueue({
      name: CHAT_TURN_QUEUE,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: 100,
      },
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
  controllers: [AppController],
  providers: [
    ExampleProcessor,
    ChatTurnProcessor,
    socketEmitterProvider,
    {
      provide: CHAT_TURN_SERVICE,
      useFactory: (
        agentStream: IAgentStreamPort,
        conversationService: IConversationService,
        workflowRepository: IWorkflowRepository,
        repositoryContext: RepositoryContextService,
        logger: EnhancedLogger
      ) => new ChatTurnService(agentStream, conversationService, workflowRepository, repositoryContext, logger),
      inject: [
        AI_AGENT_STREAM_PORT,
        CONVERSATION_SERVICE,
        WORKFLOW_REPOSITORY,
        RepositoryContextService,
        EnhancedLogger,
      ],
    },
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
        logger: EnhancedLogger,
        githubAuthService: IGitHubAuthService,
        repositoryContext: RepositoryContextService
      ) =>
        new ImplementationOrchestrationService(
          new SubTaskPrismaRepository(databaseService),
          new WorkflowDependencyPrismaRepository(databaseService),
          new WorkflowPrismaRepository(databaseService),
          artifactService,
          aiAgentService,
          configService,
          logger,
          githubAuthService,
          3,
          repositoryContext
        ),
      inject: [
        DatabaseService,
        ARTIFACT_SERVICE,
        AI_AGENT_SERVICE,
        CONFIG_SERVICE,
        EnhancedLogger,
        GITHUB_AUTH_SERVICE,
        RepositoryContextService,
      ],
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
