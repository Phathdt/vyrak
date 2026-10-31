import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { WorkflowService } from './application'
import { WORKFLOW_REPOSITORY, WORKFLOW_SERVICE, WorkflowPrismaRepository } from './infras'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: WORKFLOW_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_SERVICE,
      useFactory: (repository) => new WorkflowService(repository),
      inject: [WORKFLOW_REPOSITORY],
    },
  ],
  exports: [WORKFLOW_SERVICE],
})
export class WorkflowModule {}
