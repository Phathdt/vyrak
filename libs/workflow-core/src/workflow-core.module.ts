import { Module } from '@nestjs/common'
import { CustomConfigService } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { ProjectModule, GIT_REPOSITORY_REPOSITORY } from '@vyrak/project'

import { RepositoryContextService, WorkflowPhaseService, WorkflowService } from './application'
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

import type {
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
} from './domain'
import type { IGitRepositoryRepository } from '@vyrak/project'

@Module({
  imports: [DatabaseModule, ProjectModule],
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
      useFactory: (
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        workflowPhaseService: IWorkflowPhaseService
      ) => new WorkflowService(workflowRepo, workflowRepoRepo, workflowPhaseService),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY, WORKFLOW_PHASE_SERVICE],
    },
    {
      provide: WORKFLOW_PHASE_SERVICE,
      useFactory: (workflowRepo: IWorkflowRepository, workflowPhaseRepo: IWorkflowPhaseRepository) =>
        new WorkflowPhaseService(workflowRepo, workflowPhaseRepo),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_PHASE_REPOSITORY],
    },
    // Generic repository context service
    {
      provide: RepositoryContextService,
      useFactory: (
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepoRepo: IGitRepositoryRepository,
        configService: CustomConfigService
      ) => new RepositoryContextService(workflowRepoRepo, gitRepoRepo, configService),
      inject: [WORKFLOW_REPOSITORY_REPOSITORY, GIT_REPOSITORY_REPOSITORY, CustomConfigService],
    },
  ],
  exports: [
    WORKFLOW_SERVICE,
    WORKFLOW_PHASE_SERVICE,
    WORKFLOW_REPOSITORY,
    WORKFLOW_PHASE_REPOSITORY,
    WORKFLOW_REPOSITORY_REPOSITORY,
    RepositoryContextService,
  ],
})
export class WorkflowCoreModule {}
