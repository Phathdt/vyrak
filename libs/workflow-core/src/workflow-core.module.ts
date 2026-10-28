import { Logger, Module } from '@nestjs/common'
import {
  AGENT_EXECUTOR,
  AgentRuntimeModule,
  ARTIFACT_MANAGER,
  WORKSPACE_MANAGER,
  type IAgentExecutor,
  type IArtifactManager,
  type IWorkspaceManager,
} from '@vyrak/agent-runtime'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { AgentStepExecutor } from './application/services/agent-step-executor.service'
import { ApprovalStepExecutor, type ILogger } from './application/services/approval-step-executor.service'
import { ApprovalValidatorService } from './application/services/approval-validator.service'
import { StoryService } from './application/services/story.service'
import { ToolStepExecutor } from './application/services/tool-step-executor.service'
import { WorkflowStoryExecutionService } from './application/services/workflow-story-execution.service'
import { WorkflowTemplateService } from './application/services/workflow-template.service'
import { ApproveWorkflowUseCase } from './application/use-cases/approve-workflow.use-case'
import { CancelWorkflowUseCase } from './application/use-cases/cancel-workflow.use-case'
import { RejectWorkflowUseCase } from './application/use-cases/reject-workflow.use-case'
import { StartWorkflowUseCase } from './application/use-cases/start-workflow.use-case'
import type { IArtifactRepository } from './domain/interfaces/artifact.interface'
import type { IAuthorizationService } from './domain/interfaces/authorization.interface'
import type { IEventRepository } from './domain/interfaces/event.repository.interface'
import type { IJobQueue, JobOptions } from './domain/interfaces/job-queue.interface'
import type { IStoryRepository } from './domain/interfaces/story.repository.interface'
import type { IWorkflowApprovalRepository } from './domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowTemplateRepository } from './domain/interfaces/workflow-template.repository.interface'
import type { IWorkflowRepository } from './domain/interfaces/workflow.repository.interface'
import {
  AGENT_STEP_EXECUTOR,
  APPROVAL_STEP_EXECUTOR,
  APPROVAL_VALIDATOR_SERVICE,
  APPROVE_WORKFLOW_USE_CASE,
  ARTIFACT_REPOSITORY,
  AUTHORIZATION_SERVICE,
  CANCEL_WORKFLOW_USE_CASE,
  EVENT_REPOSITORY,
  JOB_QUEUE,
  REJECT_WORKFLOW_USE_CASE,
  START_WORKFLOW_USE_CASE,
  STEP_REPOSITORY,
  STORY_REPOSITORY,
  STORY_SERVICE,
  TEST_RESULT_PARSER,
  TOOL_STEP_EXECUTOR,
  WORKFLOW_APPROVAL_REPOSITORY,
  WORKFLOW_REPOSITORY,
  WORKFLOW_STORY_EXECUTION_SERVICE,
  WORKFLOW_TEMPLATE_REPOSITORY,
  WORKFLOW_TEMPLATE_SERVICE,
} from './infras/di/di'
import { EventPrismaRepository } from './infras/repositories/event-prisma.repository'
import { StepPrismaRepository } from './infras/repositories/step-prisma.repository'
import { StoryPrismaRepository } from './infras/repositories/story-prisma.repository'
import { WorkflowApprovalPrismaRepository } from './infras/repositories/workflow-approval-prisma.repository'
import { WorkflowPrismaRepository } from './infras/repositories/workflow-prisma.repository'
import { WorkflowTemplatePrismaRepository } from './infras/repositories/workflow-template-prisma.repository'
import { StubAuthorizationService } from './infras/services/stub-authorization.service'
import { TestResultParserService } from './infras/services/test-result-parser.service'

/**
 * Logger adapter for application services
 */
class LoggerAdapter implements ILogger {
  private readonly logger = new Logger('ApprovalStepExecutor')

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.log(message, context)
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(message, context)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(message, context)
  }
}

/**
 * Artifact repository adapter for approval step executor and validator
 */
class ArtifactRepositoryAdapter implements IArtifactRepository {
  constructor(private readonly artifactManager: IArtifactManager) {}

  async findById(id: string): Promise<{ id: string; content: string | Record<string, unknown> } | null> {
    // Delegate to artifact manager from agent-runtime
    const artifact = await this.artifactManager.getArtifact(id)
    if (!artifact) {
      return null
    }

    // Keep content as-is (can be string or object)
    return {
      id: artifact.id,
      content: artifact.content,
    }
  }
}

/**
 * Stub job queue for development/testing
 * TODO: Replace with real BullMQ implementation in production
 */
class StubJobQueue implements IJobQueue {
  private readonly logger = new Logger('StubJobQueue')

  async enqueueWorkflowJob(runId: string, organizationId: string, options?: JobOptions): Promise<void> {
    this.logger.warn('StubJobQueue: Workflow job enqueued but not processed (stub implementation)', {
      runId,
      organizationId,
      options,
    })
    // No-op: jobs are not actually processed in stub mode
  }

  async enqueueStepJob(runId: string, stepKey: string, organizationId: string, options?: JobOptions): Promise<void> {
    this.logger.warn('StubJobQueue: Step job enqueued but not processed (stub implementation)', {
      runId,
      stepKey,
      organizationId,
      options,
    })
    // No-op: jobs are not actually processed in stub mode
  }
}

/**
 * Workflow Core Module
 *
 * Provides workflow execution engine with agent integration and approval workflow
 */
@Module({
  imports: [DatabaseModule, AgentRuntimeModule],
  providers: [
    // Repositories
    {
      provide: WORKFLOW_REPOSITORY,
      useFactory: (db: DatabaseService) => new WorkflowPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: STEP_REPOSITORY,
      useFactory: (db: DatabaseService) => new StepPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: EVENT_REPOSITORY,
      useFactory: (db: DatabaseService) => new EventPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_APPROVAL_REPOSITORY,
      useFactory: (db: DatabaseService) => new WorkflowApprovalPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_TEMPLATE_REPOSITORY,
      useFactory: (db: DatabaseService) => new WorkflowTemplatePrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: STORY_REPOSITORY,
      useFactory: (db: DatabaseService) => new StoryPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: ARTIFACT_REPOSITORY,
      useFactory: (artifactManager: IArtifactManager) => new ArtifactRepositoryAdapter(artifactManager),
      inject: [ARTIFACT_MANAGER],
    },

    // Services
    {
      provide: AUTHORIZATION_SERVICE,
      useClass: StubAuthorizationService,
    },
    {
      provide: JOB_QUEUE,
      useClass: StubJobQueue,
    },
    {
      provide: APPROVAL_VALIDATOR_SERVICE,
      useFactory: (
        approvalRepo: IWorkflowApprovalRepository,
        artifactRepo: IArtifactRepository,
        eventRepo: IEventRepository
      ) => new ApprovalValidatorService(approvalRepo, artifactRepo, eventRepo),
      inject: [WORKFLOW_APPROVAL_REPOSITORY, ARTIFACT_REPOSITORY, EVENT_REPOSITORY],
    },

    // Use Cases
    {
      provide: APPROVE_WORKFLOW_USE_CASE,
      useFactory: (
        workflowRepo: IWorkflowRepository,
        approvalRepo: IWorkflowApprovalRepository,
        approvalValidator: ApprovalValidatorService,
        authService: IAuthorizationService,
        eventRepo: IEventRepository,
        jobQueue: IJobQueue
      ) => new ApproveWorkflowUseCase(workflowRepo, approvalRepo, approvalValidator, authService, eventRepo, jobQueue),
      inject: [
        WORKFLOW_REPOSITORY,
        WORKFLOW_APPROVAL_REPOSITORY,
        APPROVAL_VALIDATOR_SERVICE,
        AUTHORIZATION_SERVICE,
        EVENT_REPOSITORY,
        JOB_QUEUE,
      ],
    },
    {
      provide: REJECT_WORKFLOW_USE_CASE,
      useFactory: (
        workflowRepo: IWorkflowRepository,
        approvalRepo: IWorkflowApprovalRepository,
        authService: IAuthorizationService,
        eventRepo: IEventRepository
      ) => new RejectWorkflowUseCase(workflowRepo, approvalRepo, authService, eventRepo, new LoggerAdapter()),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_APPROVAL_REPOSITORY, AUTHORIZATION_SERVICE, EVENT_REPOSITORY],
    },
    {
      provide: CANCEL_WORKFLOW_USE_CASE,
      useFactory: (workflowRepo: IWorkflowRepository) => new CancelWorkflowUseCase(workflowRepo),
      inject: [WORKFLOW_REPOSITORY],
    },
    {
      provide: START_WORKFLOW_USE_CASE,
      useFactory: (workflowRepo: IWorkflowRepository, eventRepo: IEventRepository) =>
        new StartWorkflowUseCase(workflowRepo, eventRepo),
      inject: [WORKFLOW_REPOSITORY, EVENT_REPOSITORY],
    },

    // Step executors
    {
      provide: AGENT_STEP_EXECUTOR,
      useFactory: (
        agentExecutor: IAgentExecutor,
        workspaceManager: IWorkspaceManager,
        artifactManager: IArtifactManager
      ) => new AgentStepExecutor(agentExecutor, workspaceManager, artifactManager),
      inject: [AGENT_EXECUTOR, WORKSPACE_MANAGER, ARTIFACT_MANAGER],
    },
    {
      provide: APPROVAL_STEP_EXECUTOR,
      useFactory: (
        approvalRepo: IWorkflowApprovalRepository,
        workflowRepo: IWorkflowRepository,
        artifactRepo: IArtifactRepository,
        eventRepo: IEventRepository
      ) => new ApprovalStepExecutor(approvalRepo, workflowRepo, artifactRepo, eventRepo, new LoggerAdapter()),
      inject: [WORKFLOW_APPROVAL_REPOSITORY, WORKFLOW_REPOSITORY, ARTIFACT_REPOSITORY, EVENT_REPOSITORY],
    },
    {
      provide: TOOL_STEP_EXECUTOR,
      useFactory: (
        workspaceManager: IWorkspaceManager,
        artifactManager: IArtifactManager,
        testResultParser: TestResultParserService
      ) => new ToolStepExecutor(workspaceManager, artifactManager, testResultParser),
      inject: [WORKSPACE_MANAGER, ARTIFACT_MANAGER, TEST_RESULT_PARSER],
    },

    // Infrastructure services
    {
      provide: TEST_RESULT_PARSER,
      useClass: TestResultParserService,
    },

    // Application services
    {
      provide: WORKFLOW_TEMPLATE_SERVICE,
      useFactory: (templateRepo: IWorkflowTemplateRepository) => new WorkflowTemplateService(templateRepo),
      inject: [WORKFLOW_TEMPLATE_REPOSITORY],
    },
    {
      provide: STORY_SERVICE,
      useFactory: (storyRepo: IStoryRepository) => new StoryService(storyRepo),
      inject: [STORY_REPOSITORY],
    },
    {
      provide: WORKFLOW_STORY_EXECUTION_SERVICE,
      useFactory: (storyRepo: IStoryRepository, eventRepo: IEventRepository) =>
        new WorkflowStoryExecutionService(storyRepo, eventRepo),
      inject: [STORY_REPOSITORY, EVENT_REPOSITORY],
    },
  ],
  exports: [
    AGENT_STEP_EXECUTOR,
    APPROVAL_STEP_EXECUTOR,
    TOOL_STEP_EXECUTOR,
    APPROVAL_VALIDATOR_SERVICE,
    APPROVE_WORKFLOW_USE_CASE,
    REJECT_WORKFLOW_USE_CASE,
    CANCEL_WORKFLOW_USE_CASE,
    START_WORKFLOW_USE_CASE,
    AUTHORIZATION_SERVICE,
    WORKFLOW_REPOSITORY,
    STEP_REPOSITORY,
    EVENT_REPOSITORY,
    WORKFLOW_APPROVAL_REPOSITORY,
    ARTIFACT_REPOSITORY,
    TEST_RESULT_PARSER,
    WORKFLOW_TEMPLATE_REPOSITORY,
    WORKFLOW_TEMPLATE_SERVICE,
    STORY_REPOSITORY,
    STORY_SERVICE,
    WORKFLOW_STORY_EXECUTION_SERVICE,
  ],
})
export class WorkflowCoreModule {}
