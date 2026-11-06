import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GitHubAppConfigError, GitHubTokenGenerationError } from '../../domain/exceptions/github-auth.exceptions'
import { OctokitTokenGenerator } from './octokit-token-generator'

import type { IConfigService } from '@vyrak/custom-config'

// Mock @octokit/auth-app
vi.mock('@octokit/auth-app', () => ({
  createAppAuth: vi.fn(),
}))

import { createAppAuth } from '@octokit/auth-app'

const mockCreateAppAuth = vi.mocked(createAppAuth)

describe('OctokitTokenGenerator', () => {
  let mockConfigService: IConfigService
  let mockAuth: ReturnType<typeof vi.fn>
  let tempDir: string

  beforeEach(() => {
    vi.clearAllMocks()

    // Create temp directory for test files
    tempDir = mkdtempSync(join(tmpdir(), 'octokit-test-'))

    // Mock auth function
    mockAuth = vi.fn()
    mockCreateAppAuth.mockReturnValue(mockAuth as any)

    // Mock config service with valid GitHub App config
    mockConfigService = {
      get: vi.fn(),
      git: {
        githubApp: {
          appId: 123456,
          installationId: 87654321,
          privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----',
        },
        userName: 'test-user',
        userEmail: 'test@example.com',
      },
    } as any
  })

  afterEach(() => {
    // Clean up temp directory
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const generator = new OctokitTokenGenerator(mockConfigService)

      expect(generator).toBeDefined()
      expect(mockCreateAppAuth).toHaveBeenCalledWith({
        appId: 123456,
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----',
      })
    })

    it('should load private key from file path when privateKeyPath provided', () => {
      const keyPath = join(tempDir, 'private-key.pem')
      const keyContent = '-----BEGIN RSA PRIVATE KEY-----\nfile-key\n-----END RSA PRIVATE KEY-----'
      writeFileSync(keyPath, keyContent, 'utf-8')

      mockConfigService.git!.githubApp!.privateKey = undefined
      mockConfigService.git!.githubApp!.privateKeyPath = keyPath

      const generator = new OctokitTokenGenerator(mockConfigService)

      expect(generator).toBeDefined()
      expect(mockCreateAppAuth).toHaveBeenCalledWith({
        appId: 123456,
        privateKey: keyContent,
      })
    })

    it('should prefer privateKeyPath over privateKey when both are set', () => {
      const keyPath = join(tempDir, 'preferred.pem')
      const keyContent = '-----BEGIN RSA PRIVATE KEY-----\nfrom-file\n-----END RSA PRIVATE KEY-----'
      writeFileSync(keyPath, keyContent, 'utf-8')

      mockConfigService.git!.githubApp!.privateKey = 'inline-key-should-not-be-used'
      mockConfigService.git!.githubApp!.privateKeyPath = keyPath

      new OctokitTokenGenerator(mockConfigService)

      expect(mockCreateAppAuth).toHaveBeenCalledWith({
        appId: 123456,
        privateKey: keyContent,
      })
    })

    it('should throw GitHubAppConfigError when appId is missing', () => {
      mockConfigService.git!.githubApp!.appId = undefined

      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(GitHubAppConfigError)
      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(
        'GitHub App configuration is incomplete: appId and installationId are required'
      )
    })

    it('should throw GitHubAppConfigError when installationId is missing', () => {
      mockConfigService.git!.githubApp!.installationId = undefined

      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(GitHubAppConfigError)
    })

    it('should throw GitHubAppConfigError when both privateKey and privateKeyPath are missing', () => {
      mockConfigService.git!.githubApp!.privateKey = undefined
      mockConfigService.git!.githubApp!.privateKeyPath = undefined

      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(GitHubAppConfigError)
      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(
        'GitHub App configuration is incomplete: privateKey or privateKeyPath is required'
      )
    })

    it('should throw GitHubAppConfigError when privateKeyPath file does not exist', () => {
      mockConfigService.git!.githubApp!.privateKey = undefined
      mockConfigService.git!.githubApp!.privateKeyPath = '/non-existent/path.pem'

      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(GitHubAppConfigError)
      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(/Failed to read private key/)
    })

    it('should throw GitHubAppConfigError when git config is undefined', () => {
      mockConfigService.git = undefined

      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(GitHubAppConfigError)
    })

    it('should throw GitHubAppConfigError when githubApp config is undefined', () => {
      mockConfigService.git!.githubApp = undefined

      expect(() => new OctokitTokenGenerator(mockConfigService)).toThrow(GitHubAppConfigError)
    })
  })

  describe('generate', () => {
    it('should generate installation access token successfully', async () => {
      const mockToken = 'ghs_16C7e42F292c6912E7710c838347Ae178B4a'
      mockAuth.mockResolvedValue({ token: mockToken })

      const generator = new OctokitTokenGenerator(mockConfigService)
      const token = await generator.generate(87654321)

      expect(token).toBe(mockToken)
      expect(mockAuth).toHaveBeenCalledWith({
        type: 'installation',
        installationId: 87654321,
      })
    })

    it('should throw GitHubTokenGenerationError when API call fails', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockAuth.mockRejectedValue(apiError)

      const generator = new OctokitTokenGenerator(mockConfigService)

      await expect(generator.generate(87654321)).rejects.toThrow(GitHubTokenGenerationError)
      await expect(generator.generate(87654321)).rejects.toThrow(
        'Failed to generate token for installation 87654321: API rate limit exceeded'
      )
    })

    it('should include installation ID in error when token generation fails', async () => {
      mockAuth.mockRejectedValue(new Error('Network error'))

      const generator = new OctokitTokenGenerator(mockConfigService)

      try {
        await generator.generate(12345678)
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubTokenGenerationError)
        expect((error as GitHubTokenGenerationError).installationId).toBe(12345678)
      }
    })

    it('should handle non-Error exceptions gracefully', async () => {
      mockAuth.mockRejectedValue('String error')

      const generator = new OctokitTokenGenerator(mockConfigService)

      await expect(generator.generate(87654321)).rejects.toThrow(GitHubTokenGenerationError)
      await expect(generator.generate(87654321)).rejects.toThrow('String error')
    })
  })
})
