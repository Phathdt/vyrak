import { BullModule } from '@nestjs/bullmq'
import { AI_AGENT_SERVICE, AIAgentModule, IAIAgentService } from '@vyrak/ai-agent'
import { ARTIFACT_SERVICE, IArtifactService } from '@vyrak/artifact'
import { CONVERSATION_SERVICE, ConversationModule, IConversationService } from '@vyrak/conversation'
import { IConfigService, CONFIG_SERVICE } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import {
  WORKFLOW_PHASE_RUN_PUBLISHER,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
  SUBTASK_REPOSITORY,
  WORKFLOW_DEPENDENCY_REPOSITORY,
  SubTaskPrismaRepository,
  WorkflowDependencyPrismaRepository,
} from '@vyrak/workflow-core'
import {
  WorkflowPhaseOrchestratorService,
  ImplementationOrchestrationService,
  IMPLEMENTATION_ORCHESTRATION_SERVICE,
  CodeReviewService,
  CODE_REVIEW_SERVICE,
  QAVerificationService,
  QA_VERIFICATION_SERVICE,
  ReworkOrchestratorService,
  REWORK_ORCHESTRATOR_SERVICE,
} from '@vyrak/workflow-execution'

import { BullWorkflowPhaseRunPublisher, WORKFLOW_PHASE_RUN_QUEUE } from './workflow-phase-run.publisher'

export const workflowPhaseAutomationImports = [
  ConversationModule,
  AIAgentModule,
  BullModule.registerQueue({
    name: WORKFLOW_PHASE_RUN_QUEUE,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: false,
    },
  }),
]

export const workflowPhaseAutomationProviders = [
  BullWorkflowPhaseRunPublisher,
  {
    provide: WORKFLOW_PHASE_RUN_PUBLISHER,
    useExisting: BullWorkflowPhaseRunPublisher,
  },
  {
    provide: WorkflowPhaseOrchestratorService,
    useFactory: (
      databaseService: DatabaseService,
      conversationService: IConversationService,
      publisher: BullWorkflowPhaseRunPublisher
    ) =>
      new WorkflowPhaseOrchestratorService(
        new WorkflowPrismaRepository(databaseService),
        new WorkflowPhasePrismaRepository(databaseService),
        conversationService,
        publisher
      ),
    inject: [DatabaseService, CONVERSATION_SERVICE, BullWorkflowPhaseRunPublisher],
  },
  // Sub-task Repository
  {
    provide: SUBTASK_REPOSITORY,
    useFactory: (databaseService: DatabaseService) => new SubTaskPrismaRepository(databaseService),
    inject: [DatabaseService],
  },
  // Workflow Dependency Repository
  {
    provide: WORKFLOW_DEPENDENCY_REPOSITORY,
    useFactory: (databaseService: DatabaseService) => new WorkflowDependencyPrismaRepository(databaseService),
    inject: [DatabaseService],
  },
  // Implementation Orchestration Service
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
        3 // max concurrency
      ),
    inject: [DatabaseService, ARTIFACT_SERVICE, AI_AGENT_SERVICE, CONFIG_SERVICE, EnhancedLogger],
  },
  // Code Review Service
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
  // QA Verification Service
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
  // Rework Orchestrator Service
  {
    provide: REWORK_ORCHESTRATOR_SERVICE,
    useFactory: (
      databaseService: DatabaseService,
      codeReviewService: CodeReviewService,
      qaVerificationService: QAVerificationService,
      artifactService: IArtifactService,
      aiAgentService: IAIAgentService,
      configService: IConfigService,
      logger: EnhancedLogger
    ) =>
      new ReworkOrchestratorService(
        new WorkflowPrismaRepository(databaseService),
        new WorkflowPhasePrismaRepository(databaseService),
        codeReviewService,
        qaVerificationService,
        artifactService,
        aiAgentService,
        configService,
        logger
      ),
    inject: [
      DatabaseService,
      CODE_REVIEW_SERVICE,
      QA_VERIFICATION_SERVICE,
      ARTIFACT_SERVICE,
      AI_AGENT_SERVICE,
      CONFIG_SERVICE,
      EnhancedLogger,
    ],
  },
]
