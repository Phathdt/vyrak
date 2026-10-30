import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { ProjectService } from './application'
import { PROJECT_REPOSITORY, PROJECT_SERVICE, ProjectPrismaRepository } from './infras'

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
  ],
  exports: [PROJECT_SERVICE],
})
export class ProjectModule {}
