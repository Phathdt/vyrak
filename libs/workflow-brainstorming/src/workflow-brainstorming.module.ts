import { Module } from '@nestjs/common'
import { AI_AGENT_SERVICE, AIAgentModule, type IAIAgentService } from '@vyrak/ai-agent'
import { CONVERSATION_SERVICE, ConversationModule, type IConversationService } from '@vyrak/conversation'
import { WORKFLOW_REPOSITORY, WorkflowCoreModule, type WorkflowPrismaRepository } from '@vyrak/workflow-core'

import { WorkflowBrainstormingService } from './application'
import { WORKFLOW_BRAINSTORMING_SERVICE } from './infras'

@Module({
  imports: [WorkflowCoreModule, AIAgentModule, ConversationModule],
  providers: [
    {
      provide: WORKFLOW_BRAINSTORMING_SERVICE,
      useFactory: (
        conversationService: IConversationService,
        aiAgentService: IAIAgentService,
        workflowRepository: WorkflowPrismaRepository
      ) => new WorkflowBrainstormingService(conversationService, aiAgentService, workflowRepository),
      inject: [CONVERSATION_SERVICE, AI_AGENT_SERVICE, WORKFLOW_REPOSITORY],
    },
  ],
  exports: [WORKFLOW_BRAINSTORMING_SERVICE],
})
export class WorkflowBrainstormingModule {}
