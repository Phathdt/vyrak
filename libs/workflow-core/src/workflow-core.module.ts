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
import { ToolStepExecutor } from './application/services/tool-step-executor.service'
import { ApproveWorkflowUseCase } from './application/use-cases/approve-workflow.use-case'
import { RejectWorkflowUseCase } from './application/use-cases/reject-workflow.use-case'
import type { IArtifactRepository } from './domain/interfaces/artifact.interface'
import type { IAuthorizationService } from './domain/interfaces/authorization.interface'
import type { IEventRepository } from './domain/interfaces/event.repository.interface'
import type { IJobQueue } from './domain/interfaces/job-queue.interface'
import type { IWorkflowApprovalRepository } from './domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository } from './domain/interfaces/workflow.repository.interface'
import {
  AGENT_STEP_EXECUTOR,
  APPROVAL_STEP_EXECUTOR,
  APPROVAL_VALIDATOR_SERVICE,
  APPROVE_WORKFLOW_USE_CASE,
  ARTIFACT_REPOSITORY,
  AUTHORIZATION_SERVICE,
  EVENT_REPOSITORY,
  JOB_QUEUE,
  TEST_RESULT_PARSER,
  TOOL_STEP_EXECUTOR,
  WORKFLOW_APPROVAL_REPOSITORY,
  WORKFLOW_REPOSITORY,
} from './infras/di/di'
import { EventPrismaRepository } from './infras/repositories/event-prisma.repository'
import { WorkflowApprovalPrismaRepository } from './infras/repositories/workflow-approval-prisma.repository'
import { WorkflowPrismaRepository } from './infras/repositories/workflow-prisma.repository'
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
      useFactory: (db: DatabaseService) => new WorkflowPrismaRepository(db.client),
      inject: [DatabaseService],
    },
    {
      provide: EVENT_REPOSITORY,
      useFactory: (db: DatabaseService) => new EventPrismaRepository(db.client),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_APPROVAL_REPOSITORY,
      useFactory: (db: DatabaseService) => new WorkflowApprovalPrismaRepository(db.client),
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
      provide: RejectWorkflowUseCase,
      useFactory: (
        workflowRepo: IWorkflowRepository,
        approvalRepo: IWorkflowApprovalRepository,
        authService: IAuthorizationService,
        eventRepo: IEventRepository
      ) => new RejectWorkflowUseCase(workflowRepo, approvalRepo, authService, eventRepo, new LoggerAdapter()),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_APPROVAL_REPOSITORY, AUTHORIZATION_SERVICE, EVENT_REPOSITORY],
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
  ],
  exports: [
    AGENT_STEP_EXECUTOR,
    APPROVAL_STEP_EXECUTOR,
    TOOL_STEP_EXECUTOR,
    APPROVAL_VALIDATOR_SERVICE,
    APPROVE_WORKFLOW_USE_CASE,
    AUTHORIZATION_SERVICE,
    WORKFLOW_REPOSITORY,
    EVENT_REPOSITORY,
    WORKFLOW_APPROVAL_REPOSITORY,
    ARTIFACT_REPOSITORY,
    TEST_RESULT_PARSER,
    RejectWorkflowUseCase,
  ],
})
export class WorkflowCoreModule {}
