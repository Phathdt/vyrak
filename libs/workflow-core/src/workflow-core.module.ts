import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { WorkflowPhaseService, WorkflowService } from './application'
import {
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
  imports: [DatabaseModule],
  providers: [
    // Repositories (only 3 used ones provided)
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
      provide: WORKFLOW_REPOSITORY_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowRepositoryPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    // Services
    {
      provide: WORKFLOW_SERVICE,
      useFactory: (workflowRepo, workflowPhaseRepo, workflowRepoRepo) =>
        new WorkflowService(workflowRepo, workflowPhaseRepo, workflowRepoRepo),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_PHASE_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY],
    },
    {
      provide: WORKFLOW_PHASE_SERVICE,
      useFactory: (workflowRepo, workflowPhaseRepo) => new WorkflowPhaseService(workflowRepo, workflowPhaseRepo),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_PHASE_REPOSITORY],
    },
  ],
  exports: [WORKFLOW_SERVICE, WORKFLOW_PHASE_SERVICE],
})
export class WorkflowCoreModule {}
