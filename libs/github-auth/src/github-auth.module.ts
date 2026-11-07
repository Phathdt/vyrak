import { Module } from '@nestjs/common'
import { CONFIG_SERVICE, CustomConfigModule, parseRedisUrl, type IConfigService } from '@vyrak/custom-config'
import Redis from 'ioredis'

import { GitHubAppAuthService } from './application/services/github-app-auth.service'
import { GITHUB_APP_TOKEN_CACHE, GITHUB_APP_TOKEN_GENERATOR, GITHUB_AUTH_SERVICE } from './infras/di/di'
import { OctokitTokenGenerator } from './infras/github/octokit-token-generator'
import { RedisTokenCache } from './infras/github/redis-token-cache'

import type { IGitHubAppTokenCache, IGitHubAppTokenGenerator } from './domain/interfaces'

/**
 * GitHub App authentication module.
 *
 * Provides:
 * - GitHub App installation token generation via Octokit
 * - Token caching with Redis (50-minute TTL)
 * - Orchestrated auth service (generator + cache)
 *
 * Import this module in any app/service that needs GitHub App authentication.
 */
@Module({
  imports: [CustomConfigModule],
  providers: [
    // GitHub App Token Generator
    {
      provide: GITHUB_APP_TOKEN_GENERATOR,
      useFactory: (configService: IConfigService) => new OctokitTokenGenerator(configService),
      inject: [CONFIG_SERVICE],
    },
    // GitHub App Token Cache (Redis)
    {
      provide: GITHUB_APP_TOKEN_CACHE,
      useFactory: (configService: IConfigService) => {
        const redis = new Redis(parseRedisUrl(configService.redis.url))
        return new RedisTokenCache(redis)
      },
      inject: [CONFIG_SERVICE],
    },
    // GitHub App Auth Service (orchestrates generator + cache)
    {
      provide: GITHUB_AUTH_SERVICE,
      useFactory: (generator: IGitHubAppTokenGenerator, cache: IGitHubAppTokenCache) =>
        new GitHubAppAuthService(generator, cache),
      inject: [GITHUB_APP_TOKEN_GENERATOR, GITHUB_APP_TOKEN_CACHE],
    },
  ],
  exports: [GITHUB_AUTH_SERVICE],
})
export class GitHubAuthModule {}
