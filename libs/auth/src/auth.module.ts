import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { AuthService, PasswordService } from './application'
import {
  AUTH_REPOSITORY,
  AUTH_SERVICE,
  AuthPrismaRepository,
  JWT_PROVIDER,
  JwtProvider,
  JwtStrategy,
  PASSWORD_SERVICE,
} from './infras'

@Module({
  imports: [DatabaseModule, CustomConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    // Password Service
    {
      provide: PASSWORD_SERVICE,
      useFactory: () => new PasswordService(),
    },
    // JWT Provider
    {
      provide: JWT_PROVIDER,
      useFactory: (config: CustomConfigService) => {
        return new JwtProvider(config)
      },
      inject: [CustomConfigService],
    },
    // JWT Strategy (for Passport)
    {
      provide: JwtStrategy,
      useFactory: (config: CustomConfigService) => {
        return new JwtStrategy(config)
      },
      inject: [CustomConfigService],
    },
    // Auth Repository
    {
      provide: AUTH_REPOSITORY,
      useFactory: (databaseService: DatabaseService) => {
        return new AuthPrismaRepository(databaseService)
      },
      inject: [DatabaseService],
    },
    // Auth Service
    {
      provide: AUTH_SERVICE,
      useFactory: (authRepository, jwtProvider, passwordService) => {
        return new AuthService(authRepository, jwtProvider, passwordService)
      },
      inject: [AUTH_REPOSITORY, JWT_PROVIDER, PASSWORD_SERVICE],
    },
  ],
  exports: [AUTH_SERVICE, JWT_PROVIDER, JwtStrategy, PassportModule],
})
export class AuthModule {}
