import { Module } from '@nestjs/common'
import { AI_AGENT_SERVICE, AIAgentModule, type IAIAgentService } from '@vyrak/ai-agent'
import { ARTIFACT_SERVICE, ArtifactModule, type IArtifactService } from '@vyrak/artifact'
import { CONVERSATION_SERVICE, ConversationModule, type IConversationService } from '@vyrak/conversation'
import { CONFIG_SERVICE, CustomConfigModule } from '@vyrak/custom-config'
import { GIT_REPOSITORY_SERVICE, type IGitRepositoryService, ProjectModule } from '@vyrak/project'
import {
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  SUBTASK_REPOSITORY,
  WORKFLOW_DEPENDENCY_REPOSITORY,
  WORKFLOW_PHASE_REPOSITORY,
  WorkflowCoreModule,
  RepositoryContextService,
  type IWorkflowRepository,
  type IWorkflowRepositoryRepository,
  type ISubTaskRepository,
  type IWorkflowDependencyRepository,
  type IWorkflowPhaseRepository,
} from '@vyrak/workflow-core'
import { WorkflowExecutionModule } from '@vyrak/workflow-execution'

import { WorkflowPlanningService, TechnicalRefinementService } from './application'
import { WORKFLOW_PLANNING_SERVICE, TECHNICAL_REFINEMENT_SERVICE } from './domain/di/di-tokens'

@Module({
  imports: [
    WorkflowCoreModule,
    WorkflowExecutionModule,
    AIAgentModule,
    ArtifactModule,
    ConversationModule,
    ProjectModule,
    CustomConfigModule,
  ],
  providers: [
    {
      provide: WORKFLOW_PLANNING_SERVICE,
      useFactory: (
        conversationService: IConversationService,
        aiAgentService: IAIAgentService,
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepositoryService: IGitRepositoryService,
        repositoryContextService: RepositoryContextService,
        configService,
        artifactService: IArtifactService
      ) =>
        new WorkflowPlanningService(
          conversationService,
          aiAgentService,
          workflowRepo,
          workflowRepoRepo,
          gitRepositoryService,
          repositoryContextService,
          configService,
          artifactService
        ),
      inject: [
        CONVERSATION_SERVICE,
        AI_AGENT_SERVICE,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        GIT_REPOSITORY_SERVICE,
        RepositoryContextService,
        CONFIG_SERVICE,
        ARTIFACT_SERVICE,
      ],
    },
    {
      provide: TECHNICAL_REFINEMENT_SERVICE,
      useFactory: (
        conversationService: IConversationService,
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepositoryService: IGitRepositoryService,
        repositoryContextService: RepositoryContextService,
        artifactService: IArtifactService,
        subTaskRepo: ISubTaskRepository,
        workflowDependencyRepo: IWorkflowDependencyRepository,
        workflowPhaseRepo: IWorkflowPhaseRepository,
        configService
      ) =>
        new TechnicalRefinementService(
          conversationService,
          workflowRepo,
          workflowRepoRepo,
          gitRepositoryService,
          repositoryContextService,
          artifactService,
          subTaskRepo,
          workflowDependencyRepo,
          workflowPhaseRepo,
          configService
        ),
      inject: [
        CONVERSATION_SERVICE,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        GIT_REPOSITORY_SERVICE,
        RepositoryContextService,
        ARTIFACT_SERVICE,
        SUBTASK_REPOSITORY,
        WORKFLOW_DEPENDENCY_REPOSITORY,
        WORKFLOW_PHASE_REPOSITORY,
        CONFIG_SERVICE,
      ],
    },
  ],
  exports: [WORKFLOW_PLANNING_SERVICE, TECHNICAL_REFINEMENT_SERVICE],
})
export class WorkflowPlanningModule {}
