import { GitHubTokenCacheError } from '../../domain/exceptions/github-auth.exceptions'

import type { IGitHubAppTokenCache } from '../../domain/interfaces/github-auth.interface'
import type { OnModuleDestroy } from '@nestjs/common'
import type { Redis } from 'ioredis'

/**
 * Redis-backed token cache for GitHub App installation access tokens.
 *
 * Cache key format: `github-app:token:{installationId}`
 * TTL: 50 minutes (3000 seconds) - buffer before 1-hour token expiry
 *
 * Plain TypeScript class (no @Injectable()) registered via DI in WorkflowCoreModule.
 */
export class RedisTokenCache implements IGitHubAppTokenCache, OnModuleDestroy {
  private readonly keyPrefix = 'github-app:token:'

  constructor(private readonly redis: Redis) {}

  async get(installationId: number): Promise<string | null> {
    try {
      const key = `${this.keyPrefix}${installationId}`
      return await this.redis.get(key)
    } catch (error) {
      throw new GitHubTokenCacheError(
        `Failed to get token from cache: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async set(installationId: number, token: string, ttlSeconds: number): Promise<void> {
    try {
      const key = `${this.keyPrefix}${installationId}`
      await this.redis.set(key, token, 'EX', ttlSeconds)
    } catch (error) {
      throw new GitHubTokenCacheError(
        `Failed to set token in cache: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * NestJS lifecycle hook - close the Redis connection on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit()
    } catch {
      // Connection may already be closed or never opened; nothing to clean up.
    }
  }
}
