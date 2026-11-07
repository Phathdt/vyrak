import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { GitRepositoryService, ProjectService } from './application'
import {
  GIT_REPOSITORY_REPOSITORY,
  GIT_REPOSITORY_SERVICE,
  GitRepositoryPrismaRepository,
  PROJECT_REPOSITORY,
  PROJECT_SERVICE,
  ProjectPrismaRepository,
} from './infras'

@Module({
  imports: [DatabaseModule],
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
      provide: GIT_REPOSITORY_SERVICE,
      useFactory: (projectRepository, gitRepositoryRepository) => {
        // TODO: Task 1.8 - Wire GitRepositoryValidationService properly with GitHubAuthService
        const mockValidationService = {
          validateAccess: async () => ({ owner: '', repo: '', defaultBranch: 'main', isPrivate: false }),
        }
        return new GitRepositoryService(projectRepository, gitRepositoryRepository, mockValidationService as never)
      },
      inject: [PROJECT_REPOSITORY, GIT_REPOSITORY_REPOSITORY],
    },
  ],
  exports: [PROJECT_SERVICE, GIT_REPOSITORY_SERVICE, GIT_REPOSITORY_REPOSITORY],
})
export class ProjectModule {}
