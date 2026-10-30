import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { UserService } from './application'
import { USER_REPOSITORY, USER_SERVICE, UserPrismaRepository } from './infras'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (databaseService: DatabaseService) => {
        return new UserPrismaRepository(databaseService)
      },
      inject: [DatabaseService],
    },
    {
      provide: USER_SERVICE,
      useFactory: (userRepository) => {
        return new UserService(userRepository)
      },
      inject: [USER_REPOSITORY],
    },
  ],
  exports: [USER_SERVICE],
})
export class UserModule {}
