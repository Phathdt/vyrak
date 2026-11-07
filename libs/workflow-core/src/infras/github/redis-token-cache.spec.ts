import RedisMock from 'ioredis-mock'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GitHubTokenCacheError } from '../../domain/exceptions/github-auth.exceptions'
import { RedisTokenCache } from './redis-token-cache'

describe('RedisTokenCache', () => {
  let redis: RedisMock
  let cache: RedisTokenCache

  beforeEach(() => {
    redis = new RedisMock()
    cache = new RedisTokenCache(redis)
  })

  describe('get', () => {
    it('should return cached token when exists', async () => {
      const installationId = 12345678
      const token = 'ghs_test_token_1234567890'

      await redis.set(`github-app:token:${installationId}`, token)

      const result = await cache.get(installationId)

      expect(result).toBe(token)
    })

    it('should return null when cache miss', async () => {
      const result = await cache.get(99999999)

      expect(result).toBeNull()
    })

    it('should throw GitHubTokenCacheError when Redis fails', async () => {
      const brokenRedis = {
        get: () => Promise.reject(new Error('Redis connection failed')),
      } as any

      const brokenCache = new RedisTokenCache(brokenRedis)

      await expect(brokenCache.get(12345678)).rejects.toThrow(GitHubTokenCacheError)
      await expect(brokenCache.get(12345678)).rejects.toThrow('Failed to get token from cache')
    })
  })

  describe('set', () => {
    it('should store token with correct TTL using SETEX', async () => {
      const installationId = 12345678
      const token = 'ghs_test_token_1234567890'
      const ttl = 3000

      await cache.set(installationId, token, ttl)

      const storedToken = await redis.get(`github-app:token:${installationId}`)
      expect(storedToken).toBe(token)

      // Verify TTL was set (ioredis-mock supports TTL)
      const remainingTtl = await redis.ttl(`github-app:token:${installationId}`)
      expect(remainingTtl).toBeGreaterThan(0)
      expect(remainingTtl).toBeLessThanOrEqual(ttl)
    })

    it('should use consistent key pattern', async () => {
      const installationId = 87654321
      const token = 'ghs_another_token'

      await cache.set(installationId, token, 3000)

      // Verify key format
      const keys = await redis.keys('github-app:token:*')
      expect(keys).toContain(`github-app:token:${installationId}`)
    })

    it('should throw GitHubTokenCacheError when Redis fails', async () => {
      const brokenRedis = {
        set: () => Promise.reject(new Error('Redis write failed')),
      } as any

      const brokenCache = new RedisTokenCache(brokenRedis)

      await expect(brokenCache.set(12345678, 'token', 3000)).rejects.toThrow(GitHubTokenCacheError)
      await expect(brokenCache.set(12345678, 'token', 3000)).rejects.toThrow('Failed to set token in cache')
    })
  })

  describe('key pattern', () => {
    it('should use github-app:token:{installationId} pattern', async () => {
      const installationId = 11111111
      const token = 'ghs_pattern_test'

      await cache.set(installationId, token, 3000)

      const directGet = await redis.get(`github-app:token:${installationId}`)
      expect(directGet).toBe(token)
    })
  })

  describe('onModuleDestroy', () => {
    it('should quit the Redis connection', async () => {
      const quit = vi.fn().mockResolvedValue('OK')
      const mockRedis = { quit } as any
      const destroyCache = new RedisTokenCache(mockRedis)

      await destroyCache.onModuleDestroy()

      expect(quit).toHaveBeenCalledOnce()
    })

    it('should not throw when the connection is already closed', async () => {
      const mockRedis = {
        quit: vi.fn().mockRejectedValue(new Error('Connection already closed')),
      } as any
      const destroyCache = new RedisTokenCache(mockRedis)

      await expect(destroyCache.onModuleDestroy()).resolves.toBeUndefined()
    })
  })
})
