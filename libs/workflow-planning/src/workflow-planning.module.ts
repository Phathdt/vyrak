import { Module } from '@nestjs/common'
import { AI_AGENT_API_PORT, AIAgentModule, type IAIAgentPort } from '@vyrak/ai-agent'
import { ARTIFACT_SERVICE, ArtifactModule, type IArtifactService } from '@vyrak/artifact'
import { CONVERSATION_SERVICE, ConversationModule, type IConversationService } from '@vyrak/conversation'
import { CONFIG_SERVICE, CustomConfigModule } from '@vyrak/custom-config'
import { GIT_REPOSITORY_SERVICE, type IGitRepositoryService, ProjectModule } from '@vyrak/project'
import {
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WORKFLOW_DEPENDENCY_REPOSITORY,
  WORKFLOW_PHASE_REPOSITORY,
  WORKFLOW_WORK_ITEM_REPOSITORY,
  WorkflowCoreModule,
  RepositoryContextService,
  type IWorkflowRepository,
  type IWorkflowRepositoryRepository,
  type IWorkflowWorkItemRepository,
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
        aiAgentPort: IAIAgentPort,
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepositoryService: IGitRepositoryService,
        artifactService: IArtifactService,
        workflowPhaseRepo: IWorkflowPhaseRepository
      ) =>
        new WorkflowPlanningService(
          conversationService,
          aiAgentPort,
          workflowRepo,
          workflowRepoRepo,
          gitRepositoryService,
          artifactService,
          workflowPhaseRepo
        ),
      inject: [
        CONVERSATION_SERVICE,
        AI_AGENT_API_PORT,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        GIT_REPOSITORY_SERVICE,
        ARTIFACT_SERVICE,
        WORKFLOW_PHASE_REPOSITORY,
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
        workItemRepo: IWorkflowWorkItemRepository,
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
          workItemRepo,
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
        WORKFLOW_WORK_ITEM_REPOSITORY,
        WORKFLOW_DEPENDENCY_REPOSITORY,
        WORKFLOW_PHASE_REPOSITORY,
        CONFIG_SERVICE,
      ],
    },
  ],
  exports: [WORKFLOW_PLANNING_SERVICE, TECHNICAL_REFINEMENT_SERVICE],
})
export class WorkflowPlanningModule {}
