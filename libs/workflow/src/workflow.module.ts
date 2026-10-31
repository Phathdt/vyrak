import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { WorkflowService } from './application/services/workflow.service'
import { WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY, WORKFLOW_SERVICE } from './infras/di/di'
import { WorkflowPrismaRepository } from './infras/repositories/workflow-prisma.repository'
import { WorkflowRepositoryPrismaRepository } from './infras/repositories/workflow-repository-prisma.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: WORKFLOW_REPOSITORY,
      useClass: WorkflowPrismaRepository,
    },
    {
      provide: WORKFLOW_REPOSITORY_REPOSITORY,
      useClass: WorkflowRepositoryPrismaRepository,
    },
    {
      provide: WORKFLOW_SERVICE,
      useFactory: (workflowRepo: WorkflowPrismaRepository, workflowRepoRepo: WorkflowRepositoryPrismaRepository) => {
        return new WorkflowService(workflowRepo, workflowRepoRepo)
      },
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY],
    },
  ],
  exports: [WORKFLOW_SERVICE],
})
export class WorkflowModule {}
