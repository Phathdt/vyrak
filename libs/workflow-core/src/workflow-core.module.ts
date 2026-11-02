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
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
  WorkflowRepositoryPrismaRepository,
  SubTaskPrismaRepository,
} from './infras'

import type {
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
} from './domain'
import type { IGitRepositoryRepository } from '@vyrak/project'

@Module({
  imports: [DatabaseModule, ProjectModule, CustomConfigModule, ArtifactModule],
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
    {
      provide: SUBTASK_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new SubTaskPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: WORKFLOW_DEPENDENCY_REPOSITORY,
      useFactory: (prisma: DatabaseService) => {
        // WorkflowDependency uses same Prisma model as SubTask
        // For now, return SubTaskPrismaRepository which has dependency methods
        return new SubTaskPrismaRepository(prisma)
      },
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
      useFactory: (
        workflowRepo: IWorkflowRepository,
        workflowPhaseRepo: IWorkflowPhaseRepository,
        artifactService: IArtifactService
      ) => new WorkflowPhaseService(workflowRepo, workflowPhaseRepo, artifactService),
      inject: [WORKFLOW_REPOSITORY, WORKFLOW_PHASE_REPOSITORY, ARTIFACT_SERVICE],
    },
    // Generic repository context service
    {
      provide: RepositoryContextService,
      useFactory: (
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepoRepo: IGitRepositoryRepository,
        configService
      ) => new RepositoryContextService(workflowRepoRepo, gitRepoRepo, configService),
      inject: [WORKFLOW_REPOSITORY_REPOSITORY, GIT_REPOSITORY_REPOSITORY, CONFIG_SERVICE],
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
    RepositoryContextService,
  ],
})
export class WorkflowCoreModule {}
