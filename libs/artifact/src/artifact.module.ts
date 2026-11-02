import { Module } from '@nestjs/common'
import { CONFIG_SERVICE } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { ArtifactService } from './application'
import {
  ARTIFACT_REPOSITORY,
  ARTIFACT_SERVICE,
  ARTIFACT_STORAGE,
  ArtifactPrismaRepository,
  S3StorageService,
} from './infras'

import type { IConfigService } from '@vyrak/custom-config'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ARTIFACT_STORAGE,
      useFactory: (config: IConfigService) => new S3StorageService(config.s3),
      inject: [CONFIG_SERVICE],
    },
    {
      provide: ARTIFACT_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new ArtifactPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: ARTIFACT_SERVICE,
      useFactory: (repository, storage) => new ArtifactService(repository, storage),
      inject: [ARTIFACT_REPOSITORY, ARTIFACT_STORAGE],
    },
  ],
  exports: [ARTIFACT_SERVICE, ARTIFACT_REPOSITORY],
})
export class ArtifactModule {}
