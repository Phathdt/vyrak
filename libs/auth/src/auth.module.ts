import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { AuthService, PasswordService } from './application'
import { AuthPrismaRepository, JwtProvider, JwtStrategy } from './infras'

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
  exports: [AuthService, JwtProvider, JwtStrategy, PassportModule],
})
export class AuthModule {}
