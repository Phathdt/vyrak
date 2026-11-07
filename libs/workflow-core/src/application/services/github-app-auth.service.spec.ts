import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GitHubAppAuthService } from './github-app-auth.service'

import type { IGitHubAppTokenCache, IGitHubAppTokenGenerator } from '../../domain/interfaces/github-auth.interface'

describe('GitHubAppAuthService', () => {
  let mockGenerator: IGitHubAppTokenGenerator
  let mockCache: IGitHubAppTokenCache
  let service: GitHubAppAuthService

  beforeEach(() => {
    mockGenerator = {
      generate: vi.fn(),
    }

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
    }

    service = new GitHubAppAuthService(mockGenerator, mockCache)
  })

  describe('getToken', () => {
    it('should return cached token when cache hit (no generation)', async () => {
      const installationId = 12345678
      const cachedToken = 'ghs_cached_token_1234567890'

      vi.mocked(mockCache.get).mockResolvedValue(cachedToken)

      const result = await service.getToken(installationId)

      expect(result).toBe(cachedToken)
      expect(mockCache.get).toHaveBeenCalledWith(installationId)
      expect(mockGenerator.generate).not.toHaveBeenCalled()
      expect(mockCache.set).not.toHaveBeenCalled()
    })

    it('should generate and cache new token when cache miss', async () => {
      const installationId = 12345678
      const generatedToken = 'ghs_generated_token_1234567890'

      vi.mocked(mockCache.get).mockResolvedValue(null)
      vi.mocked(mockGenerator.generate).mockResolvedValue(generatedToken)

      const result = await service.getToken(installationId)

      expect(result).toBe(generatedToken)
      expect(mockCache.get).toHaveBeenCalledWith(installationId)
      expect(mockGenerator.generate).toHaveBeenCalledWith(installationId)
      expect(mockCache.set).toHaveBeenCalledWith(installationId, generatedToken, 3000)
    })

    it('should cache token with 3000 seconds TTL (50 minutes)', async () => {
      const installationId = 12345678
      const generatedToken = 'ghs_token'

      vi.mocked(mockCache.get).mockResolvedValue(null)
      vi.mocked(mockGenerator.generate).mockResolvedValue(generatedToken)

      await service.getToken(installationId)

      expect(mockCache.set).toHaveBeenCalledWith(
        installationId,
        generatedToken,
        3000 // 50 minutes
      )
    })

    it('should generate token when cache read fails (fallback)', async () => {
      const installationId = 12345678
      const generatedToken = 'ghs_fallback_token'
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.mocked(mockCache.get).mockRejectedValue(new Error('Redis connection failed'))
      vi.mocked(mockGenerator.generate).mockResolvedValue(generatedToken)

      const result = await service.getToken(installationId)

      expect(result).toBe(generatedToken)
      expect(mockGenerator.generate).toHaveBeenCalledWith(installationId)
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Cache read failed'), expect.any(Error))

      consoleWarnSpy.mockRestore()
    })

    it('should return token even when cache write fails (non-fatal)', async () => {
      const installationId = 12345678
      const generatedToken = 'ghs_token_no_cache'
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.mocked(mockCache.get).mockResolvedValue(null)
      vi.mocked(mockGenerator.generate).mockResolvedValue(generatedToken)
      vi.mocked(mockCache.set).mockRejectedValue(new Error('Redis write failed'))

      const result = await service.getToken(installationId)

      expect(result).toBe(generatedToken)
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Cache write failed'), expect.any(Error))

      consoleWarnSpy.mockRestore()
    })

    it('should propagate generator errors (fatal)', async () => {
      const installationId = 12345678

      vi.mocked(mockCache.get).mockResolvedValue(null)
      vi.mocked(mockGenerator.generate).mockRejectedValue(new Error('GitHub API rate limit'))

      await expect(service.getToken(installationId)).rejects.toThrow('GitHub API rate limit')
    })
  })

  describe('cache behavior', () => {
    it('should not call generator on cache hit', async () => {
      vi.mocked(mockCache.get).mockResolvedValue('ghs_cached')

      await service.getToken(12345678)

      expect(mockGenerator.generate).not.toHaveBeenCalled()
    })

    it('should call generator exactly once on cache miss', async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null)
      vi.mocked(mockGenerator.generate).mockResolvedValue('ghs_fresh')

      await service.getToken(12345678)

      expect(mockGenerator.generate).toHaveBeenCalledTimes(1)
    })

    it('should store generated token before returning it', async () => {
      const installationId = 12345678
      const token = 'ghs_new_token'
      const setCallOrder: string[] = []

      vi.mocked(mockCache.get).mockResolvedValue(null)
      vi.mocked(mockGenerator.generate).mockResolvedValue(token)
      vi.mocked(mockCache.set).mockImplementation(async () => {
        setCallOrder.push('set')
      })

      const result = await service.getToken(installationId)
      setCallOrder.push('return')

      expect(result).toBe(token)
      expect(setCallOrder).toEqual(['set', 'return'])
    })
  })
})
