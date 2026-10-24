import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { AuthService } from './application/services'
import { AUTH_REPOSITORY } from './infras/di'
import { AuthPrismaRepository } from './infras/repositories'

@Module({
  imports: [DatabaseModule],
  providers: [
    AuthService,
    {
      provide: AUTH_REPOSITORY,
      useClass: AuthPrismaRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
