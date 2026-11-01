import { Module } from '@nestjs/common'
import { AI_AGENT_SERVICE, AIAgentModule, type IAIAgentService } from '@vyrak/ai-agent'
import { CONVERSATION_SERVICE, ConversationModule, type IConversationService } from '@vyrak/conversation'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'
import { GIT_REPOSITORY_SERVICE, type IGitRepositoryService, ProjectModule } from '@vyrak/project'
import {
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WorkflowCoreModule,
  type IWorkflowRepository,
  type IWorkflowRepositoryRepository,
} from '@vyrak/workflow-core'

import { WorkflowPlanningService } from './application'
import { WORKFLOW_PLANNING_SERVICE } from './infras'

@Module({
  imports: [WorkflowCoreModule, AIAgentModule, ConversationModule, ProjectModule, CustomConfigModule],
  providers: [
    {
      provide: WORKFLOW_PLANNING_SERVICE,
      useFactory: (
        conversationService: IConversationService,
        aiAgentService: IAIAgentService,
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepositoryService: IGitRepositoryService,
        configService: CustomConfigService
      ) =>
        new WorkflowPlanningService(
          conversationService,
          aiAgentService,
          workflowRepo,
          workflowRepoRepo,
          gitRepositoryService,
          configService
        ),
      inject: [
        CONVERSATION_SERVICE,
        AI_AGENT_SERVICE,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        GIT_REPOSITORY_SERVICE,
        CustomConfigService,
      ],
    },
  ],
  exports: [WORKFLOW_PLANNING_SERVICE],
})
export class WorkflowPlanningModule {}
