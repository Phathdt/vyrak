import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { AuthService, PasswordService } from './application'
import { AuthPrismaRepository, JwtProvider, JwtStrategy } from './infras'

@Module({
  imports: [DatabaseModule, CustomConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    PasswordService,
    {
      provide: JwtProvider,
      useFactory: (config: CustomConfigService) => {
        return new JwtProvider(config)
      },
      inject: [CustomConfigService],
    },
    {
      provide: JwtStrategy,
      useFactory: (config: CustomConfigService) => {
        return new JwtStrategy(config)
      },
      inject: [CustomConfigService],
    },
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
