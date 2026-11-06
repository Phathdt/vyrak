import { Module } from '@nestjs/common'
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
  type IWorkflowRepository,
  type IWorkflowRepositoryRepository,
  type IWorkflowWorkItemRepository,
  type IWorkflowDependencyRepository,
  type IWorkflowPhaseRepository,
} from '@vyrak/workflow-core'

import { WorkflowPlanningService, TechnicalRefinementService } from './application'
import { WORKFLOW_PLANNING_SERVICE, TECHNICAL_REFINEMENT_SERVICE } from './domain/di/di-tokens'

@Module({
  imports: [WorkflowCoreModule, ArtifactModule, ConversationModule, ProjectModule, CustomConfigModule],
  providers: [
    {
      provide: WORKFLOW_PLANNING_SERVICE,
      useFactory: (
        conversationService: IConversationService,
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepositoryService: IGitRepositoryService,
        artifactService: IArtifactService
      ) =>
        new WorkflowPlanningService(
          conversationService,
          workflowRepo,
          workflowRepoRepo,
          gitRepositoryService,
          artifactService
        ),
      inject: [
        CONVERSATION_SERVICE,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        GIT_REPOSITORY_SERVICE,
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
