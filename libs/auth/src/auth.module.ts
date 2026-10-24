import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { AuthService } from './application/services'
import { AuthPrismaRepository } from './infras/repositories'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AuthService,
      useFactory: (databaseService: DatabaseService) => {
        // Instantiate repository with Prisma client
        const repository = new AuthPrismaRepository(databaseService.client)

        // Instantiate service with repository
        return new AuthService(repository)
      },
      inject: [DatabaseService],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
