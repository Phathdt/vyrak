import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ProjectNotFoundError, RepositoryAlreadyConnectedError } from '../../domain/exceptions'
import { GitRepositoryValidationService } from './git-repository-validation.service'
import { GitRepositoryService } from './git-repository.service'

import type { GitRepositoryEntity } from '../../domain/entities/git-repository.entity'
import type { IGitRepositoryRepository } from '../../domain/interfaces/git-repository-repository.interface'
import type { IProjectRepository } from '../../domain/interfaces/project-repository.interface'

describe('GitRepositoryService', () => {
  let service: GitRepositoryService
  let mockProjectRepo: IProjectRepository
  let mockGitRepo: IGitRepositoryRepository
  let mockValidationService: GitRepositoryValidationService

  beforeEach(() => {
    mockProjectRepo = {
      findOne: vi.fn(),
    } as any

    mockGitRepo = {
      findByProjectId: vi.fn(),
      findById: vi.fn(),
      findByUrl: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
    } as any

    mockValidationService = {
      validateAccess: vi.fn(),
    } as any

    service = new GitRepositoryService(mockProjectRepo, mockGitRepo, mockValidationService)
  })

  describe('create', () => {
    it('should create repository with validated metadata', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' }
      const mockMetadata = { owner: 'octocat', repo: 'hello-world', defaultBranch: 'main', isPrivate: false }
      const mockCreated: GitRepositoryEntity = {
        id: 'repo-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        name: 'hello-world',
        url: 'https://github.com/octocat/hello-world',
        branch: 'main',
        provider: 'github',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockProjectRepo.findOne).mockResolvedValue(mockProject as any)
      vi.mocked(mockValidationService.validateAccess).mockResolvedValue(mockMetadata)
      vi.mocked(mockGitRepo.findByUrl).mockResolvedValue(null)
      vi.mocked(mockGitRepo.create).mockResolvedValue(mockCreated)

      const result = await service.create('org-1', 'proj-1', {
        url: 'https://github.com/octocat/hello-world',
      })

      expect(result).toEqual(mockCreated)
      expect(mockValidationService.validateAccess).toHaveBeenCalledWith('https://github.com/octocat/hello-world')
      expect(mockGitRepo.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        projectId: 'proj-1',
        name: 'hello-world',
        url: 'https://github.com/octocat/hello-world',
        branch: 'main',
        provider: 'github',
        status: 'active',
      })
    })

    it('should use custom branch if provided', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' }
      const mockMetadata = { owner: 'octocat', repo: 'hello-world', defaultBranch: 'main', isPrivate: false }

      vi.mocked(mockProjectRepo.findOne).mockResolvedValue(mockProject as any)
      vi.mocked(mockValidationService.validateAccess).mockResolvedValue(mockMetadata)
      vi.mocked(mockGitRepo.findByUrl).mockResolvedValue(null)
      vi.mocked(mockGitRepo.create).mockResolvedValue({} as any)

      await service.create('org-1', 'proj-1', {
        url: 'https://github.com/octocat/hello-world',
        branch: 'develop',
      })

      expect(mockGitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          branch: 'develop',
        })
      )
    })

    it('should throw ProjectNotFoundError if project does not exist', async () => {
      vi.mocked(mockProjectRepo.findOne).mockResolvedValue(null)

      await expect(
        service.create('org-1', 'proj-1', { url: 'https://github.com/octocat/hello-world' })
      ).rejects.toThrow(ProjectNotFoundError)
    })

    it('should throw RepositoryAlreadyConnectedError if repository already exists', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' }
      const mockMetadata = { owner: 'octocat', repo: 'hello-world', defaultBranch: 'main', isPrivate: false }
      const existingRepo: GitRepositoryEntity = {
        id: 'repo-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        name: 'hello-world',
        url: 'https://github.com/octocat/hello-world',
        branch: 'main',
        provider: 'github',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockProjectRepo.findOne).mockResolvedValue(mockProject as any)
      vi.mocked(mockValidationService.validateAccess).mockResolvedValue(mockMetadata)
      vi.mocked(mockGitRepo.findByUrl).mockResolvedValue(existingRepo)

      await expect(
        service.create('org-1', 'proj-1', { url: 'https://github.com/octocat/hello-world' })
      ).rejects.toThrow(RepositoryAlreadyConnectedError)
    })
  })

  describe('delete', () => {
    it('should soft delete repository by updating status', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' }
      const mockRepo: GitRepositoryEntity = {
        id: 'repo-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        name: 'hello-world',
        url: 'https://github.com/octocat/hello-world',
        branch: 'main',
        provider: 'github',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockProjectRepo.findOne).mockResolvedValue(mockProject as any)
      vi.mocked(mockGitRepo.findById).mockResolvedValue(mockRepo)

      await service.delete('org-1', 'proj-1', 'repo-1')

      expect(mockGitRepo.updateStatus).toHaveBeenCalledWith('repo-1', 'deleted')
    })

    it('should throw if repository does not belong to project', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' }
      const mockRepo: GitRepositoryEntity = {
        id: 'repo-1',
        organizationId: 'org-1',
        projectId: 'proj-2', // Different project
        name: 'hello-world',
        url: 'https://github.com/octocat/hello-world',
        branch: 'main',
        provider: 'github',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockProjectRepo.findOne).mockResolvedValue(mockProject as any)
      vi.mocked(mockGitRepo.findById).mockResolvedValue(mockRepo)

      await expect(service.delete('org-1', 'proj-1', 'repo-1')).rejects.toThrow()
    })
  })
})
