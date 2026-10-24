import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { AuthService } from './application/services/auth.service'
import { PasswordService } from './application/services/password.service'
import { JwtProvider, JwtStrategy } from './infras/jwt'
import { AuthPrismaRepository } from './infras/repositories'

@Module({
  imports: [DatabaseModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    JwtProvider,
    JwtStrategy,
    PasswordService,
    {
      provide: AuthService,
      useFactory: (databaseService: DatabaseService, jwtProvider: JwtProvider, passwordService: PasswordService) => {
        // Instantiate repository with Prisma client
        const repository = new AuthPrismaRepository(databaseService.client)

        // Instantiate service with repository, jwt provider, and password service
        return new AuthService(repository, jwtProvider, passwordService)
      },
      inject: [DatabaseService, JwtProvider, PasswordService],
    },
  ],
  exports: [AuthService, JwtProvider],
})
export class AuthModule {}
