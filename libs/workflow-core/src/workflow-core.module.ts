import { Module } from '@nestjs/common'
import { ARTIFACT_SERVICE, ArtifactModule, type IArtifactService } from '@vyrak/artifact'
import { CONFIG_SERVICE, CustomConfigModule } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { ProjectModule, GIT_REPOSITORY_REPOSITORY } from '@vyrak/project'

import { RepositoryContextService, WorkflowPhaseService, WorkflowService } from './application'
import {
  WORKFLOW_PHASE_REPOSITORY,
  WORKFLOW_PHASE_SERVICE,
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WORKFLOW_SERVICE,
  SUBTASK_REPOSITORY,
  WORKFLOW_DEPENDENCY_REPOSITORY,
  WORKFLOW_WORK_ITEM_REPOSITORY,
  UNIT_OF_WORK,
  REPO_CACHE_SERVICE,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
  WorkflowRepositoryPrismaRepository,
  SubTaskPrismaRepository,
  WorkflowDependencyPrismaRepository,
  WorkflowWorkItemPrismaRepository,
  PrismaUnitOfWork,
} from './infras'
import { RepoCacheService } from './infras/workspace/repo-cache.service'

import type {
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
  IUnitOfWork,
} from './domain'
import type { IRepoCacheService } from './domain/interfaces/repo-cache.interface'
import type { IConfigService } from '@vyrak/custom-config'
import type { IGitRepositoryRepository } from '@vyrak/project'

@Module({
  imports: [DatabaseModule, ProjectModule, CustomConfigModule, ArtifactModule],
  providers: [
    // Unit of Work
    {
      provide: UNIT_OF_WORK,
      useFactory: (database: DatabaseService) => new PrismaUnitOfWork(database),
      inject: [DatabaseService],
    },
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
    {
      provide: SUBTASK_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new SubTaskPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_DEPENDENCY_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowDependencyPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_WORK_ITEM_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new WorkflowWorkItemPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    // Services
    {
      provide: WORKFLOW_SERVICE,
      useFactory: (
        workflowRepo: IWorkflowRepository,
        workflowRepoRepo: IWorkflowRepositoryRepository,
        workflowPhaseService: IWorkflowPhaseService,
        workflowPhaseRepo: IWorkflowPhaseRepository
      ) => new WorkflowService(workflowRepo, workflowRepoRepo, workflowPhaseService, workflowPhaseRepo),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_REPOSITORY_REPOSITORY, WORKFLOW_PHASE_SERVICE, WORKFLOW_PHASE_REPOSITORY],
    },
    {
      provide: WORKFLOW_PHASE_SERVICE,
      useFactory: (
        workflowRepo: IWorkflowRepository,
        workflowPhaseRepo: IWorkflowPhaseRepository,
        artifactService: IArtifactService,
        unitOfWork: IUnitOfWork
      ) => new WorkflowPhaseService(workflowRepo, workflowPhaseRepo, artifactService, unitOfWork),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_PHASE_REPOSITORY, ARTIFACT_SERVICE, UNIT_OF_WORK],
    },
    // Local clone cache (one clone per repository on this host)
    {
      provide: REPO_CACHE_SERVICE,
      useFactory: (configService: IConfigService) => new RepoCacheService(configService),
      inject: [CONFIG_SERVICE],
    },
    // Generic repository context service
    {
      provide: RepositoryContextService,
      useFactory: (
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepoRepo: IGitRepositoryRepository,
        repoCache: IRepoCacheService
      ) => new RepositoryContextService(workflowRepoRepo, gitRepoRepo, repoCache),
      inject: [WORKFLOW_REPOSITORY_REPOSITORY, GIT_REPOSITORY_REPOSITORY, REPO_CACHE_SERVICE],
    },
  ],
  exports: [
    WORKFLOW_SERVICE,
    WORKFLOW_PHASE_SERVICE,
    WORKFLOW_REPOSITORY,
    WORKFLOW_PHASE_REPOSITORY,
    WORKFLOW_REPOSITORY_REPOSITORY,
    SUBTASK_REPOSITORY,
    WORKFLOW_DEPENDENCY_REPOSITORY,
    WORKFLOW_WORK_ITEM_REPOSITORY,
    UNIT_OF_WORK,
    REPO_CACHE_SERVICE,
    RepositoryContextService,
  ],
})
export class WorkflowCoreModule {}
