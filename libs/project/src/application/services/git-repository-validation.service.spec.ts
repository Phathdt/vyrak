import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  GitHubRepositoryNotFoundError,
  InvalidRepositoryUrlError,
  RepositoryAccessDeniedError,
} from '../../domain/exceptions'
import { GitRepositoryValidationService } from './git-repository-validation.service'

import type { IGitHubAuthService } from '@vyrak/workflow-core'

// Mock @octokit/rest
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      rest: {
        repos: {
          get: vi.fn(),
        },
      },
    })),
  }
})

describe('GitRepositoryValidationService', () => {
  const mockGitHubAuth: IGitHubAuthService = {
    getToken: vi.fn().mockResolvedValue('ghs_mock_token'),
  } as any

  let service: GitRepositoryValidationService

  beforeEach(() => {
    service = new GitRepositoryValidationService(mockGitHubAuth)
  })

  it('should validate accessible repository and return metadata', async () => {
    const { Octokit } = await import('@octokit/rest')
    const mockGet = vi.fn().mockResolvedValue({
      data: {
        default_branch: 'main',
        private: false,
      },
    })
    ;(Octokit as any).mockImplementation(function (this: any) {
      this.rest = { repos: { get: mockGet } }
    })

    const result = await service.validateAccess('https://github.com/octocat/hello-world')

    expect(result).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      defaultBranch: 'main',
      isPrivate: false,
    })
    expect(mockGet).toHaveBeenCalledWith({ owner: 'octocat', repo: 'hello-world' })
  })

  it('should throw GitHubRepositoryNotFoundError for 404 response', async () => {
    const { Octokit } = await import('@octokit/rest')
    const mockGet = vi.fn().mockRejectedValue({ status: 404 })
    ;(Octokit as any).mockImplementation(function (this: any) {
      this.rest = { repos: { get: mockGet } }
    })

    await expect(service.validateAccess('https://github.com/octocat/nonexistent')).rejects.toThrow(
      GitHubRepositoryNotFoundError
    )
  })

  it('should throw RepositoryAccessDeniedError for 403 response', async () => {
    const { Octokit } = await import('@octokit/rest')
    const mockGet = vi.fn().mockRejectedValue({ status: 403 })
    ;(Octokit as any).mockImplementation(function (this: any) {
      this.rest = { repos: { get: mockGet } }
    })

    await expect(service.validateAccess('https://github.com/private-org/secret-repo')).rejects.toThrow(
      RepositoryAccessDeniedError
    )
  })

  it('should throw InvalidRepositoryUrlError for invalid URL', async () => {
    await expect(service.validateAccess('not-a-valid-url')).rejects.toThrow(InvalidRepositoryUrlError)
  })

  it('should propagate other errors (network, rate limit)', async () => {
    const { Octokit } = await import('@octokit/rest')
    const networkError = new Error('Network error')
    const mockGet = vi.fn().mockRejectedValue(networkError)
    ;(Octokit as any).mockImplementation(function (this: any) {
      this.rest = { repos: { get: mockGet } }
    })

    await expect(service.validateAccess('https://github.com/octocat/hello-world')).rejects.toThrow('Network error')
  })
})
