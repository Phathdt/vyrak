import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { CONFIG_SERVICE, CustomConfigModule } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { OrganizationModule, ORGANIZATION_SERVICE } from '@vyrak/organization'
import { UserModule, USER_SERVICE } from '@vyrak/user'

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
  imports: [
    DatabaseModule,
    CustomConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
    OrganizationModule,
  ],
  providers: [
    // Password Service
    {
      provide: PASSWORD_SERVICE,
      useFactory: () => new PasswordService(),
    },
    // JWT Provider
    {
      provide: JWT_PROVIDER,
      useFactory: (config) => {
        return new JwtProvider(config)
      },
      inject: [CONFIG_SERVICE],
    },
    // JWT Strategy (for Passport)
    {
      provide: JwtStrategy,
      useFactory: (config) => {
        return new JwtStrategy(config)
      },
      inject: [CONFIG_SERVICE],
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
      useFactory: (authRepository, userService, organizationService, jwtProvider, passwordService) => {
        return new AuthService(authRepository, userService, organizationService, jwtProvider, passwordService)
      },
      inject: [AUTH_REPOSITORY, USER_SERVICE, ORGANIZATION_SERVICE, JWT_PROVIDER, PASSWORD_SERVICE],
    },
  ],
  exports: [AUTH_SERVICE, JWT_PROVIDER, JwtStrategy, PassportModule],
})
export class AuthModule {}
