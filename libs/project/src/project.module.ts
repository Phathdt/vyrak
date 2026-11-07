import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { GitHubAuthModule, GITHUB_AUTH_SERVICE, type IGitHubAuthService } from '@vyrak/workflow-core'

import { GitRepositoryService, GitRepositoryValidationService, ProjectService } from './application'
import {
  GIT_REPOSITORY_REPOSITORY,
  GIT_REPOSITORY_SERVICE,
  GIT_REPOSITORY_VALIDATION_SERVICE,
  GitRepositoryPrismaRepository,
  PROJECT_REPOSITORY,
  PROJECT_SERVICE,
  ProjectPrismaRepository,
} from './infras'

@Module({
  imports: [DatabaseModule, GitHubAuthModule],
  providers: [
    {
      provide: PROJECT_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new ProjectPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: PROJECT_SERVICE,
      useFactory: (repository) => new ProjectService(repository),
      inject: [PROJECT_REPOSITORY],
    },
    {
      provide: GIT_REPOSITORY_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new GitRepositoryPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: GIT_REPOSITORY_VALIDATION_SERVICE,
      useFactory: (githubAuth: IGitHubAuthService) => new GitRepositoryValidationService(githubAuth),
      inject: [GITHUB_AUTH_SERVICE],
    },
    {
      provide: GIT_REPOSITORY_SERVICE,
      useFactory: (projectRepository, gitRepositoryRepository, validationService) =>
        new GitRepositoryService(projectRepository, gitRepositoryRepository, validationService),
      inject: [PROJECT_REPOSITORY, GIT_REPOSITORY_REPOSITORY, GIT_REPOSITORY_VALIDATION_SERVICE],
    },
  ],
  exports: [PROJECT_SERVICE, GIT_REPOSITORY_SERVICE, GIT_REPOSITORY_REPOSITORY],
})
export class ProjectModule {}
