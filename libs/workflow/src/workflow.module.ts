import { Module } from '@nestjs/common'
import { AIAgentModule, AIAgentService } from '@vyrak/ai-agent'
import { ConversationModule, ConversationService } from '@vyrak/conversation'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { WorkflowBrainstormingService, WorkflowPhaseService, WorkflowService } from './application'
import {
  WORKFLOW_BRAINSTORMING_SERVICE,
  WORKFLOW_PHASE_REPOSITORY,
  WORKFLOW_PHASE_SERVICE,
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WORKFLOW_SERVICE,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
  WorkflowRepositoryPrismaRepository,
} from './infras'

@Module({
  imports: [DatabaseModule, AIAgentModule, ConversationModule],
  providers: [
    {
      provide: WORKFLOW_BRAINSTORMING_SERVICE,
      useFactory: (
        conversationService: ConversationService,
        aiAgentService: AIAgentService,
        workflowRepository: WorkflowPrismaRepository
      ) => new WorkflowBrainstormingService(conversationService, aiAgentService, workflowRepository),
      inject: [ConversationService, AIAgentService, WORKFLOW_REPOSITORY],
    },
    {
      provide: WORKFLOW_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_PHASE_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowPhasePrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_PHASE_SERVICE,
      useFactory: (workflowRepo: WorkflowPrismaRepository, phaseRepo: WorkflowPhasePrismaRepository) =>
        new WorkflowPhaseService(workflowRepo, phaseRepo),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_PHASE_REPOSITORY],
    },
    {
      provide: WORKFLOW_REPOSITORY_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowRepositoryPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_SERVICE,
      useFactory: (
        workflowRepo: WorkflowPrismaRepository,
        workflowRepoRepo: WorkflowRepositoryPrismaRepository,
        workflowPhaseService: WorkflowPhaseService
      ) => {
        return new WorkflowService(workflowRepo, workflowRepoRepo, workflowPhaseService)
      },
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY, WORKFLOW_PHASE_SERVICE],
    },
  ],
  exports: [WORKFLOW_SERVICE, WORKFLOW_BRAINSTORMING_SERVICE, WORKFLOW_PHASE_SERVICE],
})
export class WorkflowModule {}
