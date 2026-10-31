import { Module } from '@nestjs/common'
import { AIAgentModule } from '@vyrak/ai-agent'
import { ConversationModule } from '@vyrak/conversation'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { WorkflowBrainstormingService, WorkflowService } from './application'
import {
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WORKFLOW_SERVICE,
  WorkflowPrismaRepository,
  WorkflowRepositoryPrismaRepository,
} from './infras'

@Module({
  imports: [DatabaseModule, AIAgentModule, ConversationModule],
  providers: [
    WorkflowBrainstormingService,
    {
      provide: WORKFLOW_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_REPOSITORY_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowRepositoryPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_SERVICE,
      useFactory: (workflowRepo: WorkflowPrismaRepository, workflowRepoRepo: WorkflowRepositoryPrismaRepository) => {
        return new WorkflowService(workflowRepo, workflowRepoRepo)
      },
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY],
    },
  ],
  exports: [WORKFLOW_SERVICE, WorkflowBrainstormingService],
})
export class WorkflowModule {}
