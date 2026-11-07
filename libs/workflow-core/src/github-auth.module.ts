import { Module } from '@nestjs/common'
import { CONFIG_SERVICE, CustomConfigModule, parseRedisUrl, type IConfigService } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'
import { GIT_REPOSITORY_REPOSITORY, ProjectModule, type IGitRepositoryRepository } from '@vyrak/project'
import Redis from 'ioredis'

import { GitHubAppAuthService } from './application/services/github-app-auth.service'
import { RepositoryContextService } from './application/services/repository-context.service'
import {
  GITHUB_APP_TOKEN_CACHE,
  GITHUB_APP_TOKEN_GENERATOR,
  GITHUB_AUTH_SERVICE,
  REPO_CACHE_SERVICE,
  WORKFLOW_REPOSITORY_REPOSITORY,
  OctokitTokenGenerator,
  RedisTokenCache,
  WorkflowRepositoryPrismaRepository,
} from './infras'
import { RepoCacheService } from './infras/workspace/repo-cache.service'

import type {
  IGitHubAppTokenCache,
  IGitHubAppTokenGenerator,
  IGitHubAuthService,
  IRepoCacheService,
  IWorkflowRepositoryRepository,
} from './domain/interfaces'

/**
 * GitHub App authentication and repository cache module.
 *
 * Provides:
 * - GitHub App installation token generation
 * - Token caching with Redis
 * - Repository clone/fetch cache service
 * - Repository context resolution
 *
 * Import this module only in apps/services that perform git operations (worker, workflow-execution).
 * DO NOT import in api-server — it only needs WorkflowCoreModule for domain services.
 */
@Module({
  imports: [CustomConfigModule, DatabaseModule, ProjectModule],
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
    // Repository Cache Service (local clone cache)
    {
      provide: REPO_CACHE_SERVICE,
      useFactory: (configService: IConfigService, githubAuthService: IGitHubAuthService) =>
        new RepoCacheService(configService, githubAuthService),
      inject: [CONFIG_SERVICE, GITHUB_AUTH_SERVICE],
    },
    // Workflow Repository Repository (for RepositoryContextService)
    {
      provide: WORKFLOW_REPOSITORY_REPOSITORY,
      useFactory: (db: DatabaseService) => new WorkflowRepositoryPrismaRepository(db),
      inject: [DatabaseService],
    },
    // Repository Context Service (resolves repo paths for workflows)
    {
      provide: RepositoryContextService,
      useFactory: (
        workflowRepoRepo: IWorkflowRepositoryRepository,
        gitRepoRepo: IGitRepositoryRepository,
        repoCache: IRepoCacheService
      ) => new RepositoryContextService(workflowRepoRepo, gitRepoRepo, repoCache),
      inject: [WORKFLOW_REPOSITORY_REPOSITORY, GIT_REPOSITORY_REPOSITORY, REPO_CACHE_SERVICE],
    },
  ],
  exports: [GITHUB_AUTH_SERVICE, REPO_CACHE_SERVICE, RepositoryContextService],
})
export class GitHubAuthModule {}
