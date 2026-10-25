import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ArtifactManager } from './artifact-manager.service'

import type { ArtifactEntity, IArtifactRepository } from '../../domain/interfaces/artifact-repository.interface'

describe('ArtifactManager', () => {
  let manager: ArtifactManager
  let mockRepository: {
    create: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    findByRunId: ReturnType<typeof vi.fn>
    findByOrganization: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByRunId: vi.fn(),
      findByOrganization: vi.fn(),
      delete: vi.fn(),
    }

    manager = new ArtifactManager(mockRepository as unknown as IArtifactRepository)
  })

  describe('saveArtifact', () => {
    it('should save artifact and return ID', async () => {
      const params = {
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'plan.md',
        content: '# Plan\n\nTest plan content',
      }

      const mockArtifact: ArtifactEntity = {
        id: 'artifact-123',
        ...params,
        createdAt: new Date(),
      }

      mockRepository.create.mockResolvedValue(mockArtifact)

      const artifactId = await manager.saveArtifact(params)

      expect(artifactId).toBe('artifact-123')
      expect(mockRepository.create).toHaveBeenCalledWith(params)
    })

    it('should warn about large artifacts', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const largeContent = 'x'.repeat(2 * 1024 * 1024) // 2MB

      const params = {
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'large-plan.md',
        content: largeContent,
      }

      mockRepository.create.mockResolvedValue({
        id: 'artifact-123',
        ...params,
        createdAt: new Date(),
      })

      await manager.saveArtifact(params)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Large artifact detected'))

      consoleSpy.mockRestore()
    })

    it('should not warn about small artifacts', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const params = {
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'small.md',
        content: 'Small content',
      }

      mockRepository.create.mockResolvedValue({
        id: 'artifact-123',
        ...params,
        createdAt: new Date(),
      })

      await manager.saveArtifact(params)

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getArtifact', () => {
    it('should return artifact by ID', async () => {
      const mockArtifact: ArtifactEntity = {
        id: 'artifact-123',
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'plan.md',
        content: 'content',
        createdAt: new Date(),
      }

      mockRepository.findById.mockResolvedValue(mockArtifact)

      const artifact = await manager.getArtifact('artifact-123')

      expect(artifact).toEqual(mockArtifact)
      expect(mockRepository.findById).toHaveBeenCalledWith('artifact-123')
    })

    it('should return null if not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const artifact = await manager.getArtifact('non-existent')

      expect(artifact).toBeNull()
    })
  })

  describe('getArtifactContent', () => {
    it('should return artifact content', async () => {
      const mockArtifact: ArtifactEntity = {
        id: 'artifact-123',
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'plan.md',
        content: 'Test content',
        createdAt: new Date(),
      }

      mockRepository.findById.mockResolvedValue(mockArtifact)

      const content = await manager.getArtifactContent('artifact-123')

      expect(content).toBe('Test content')
    })

    it('should return null if artifact not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const content = await manager.getArtifactContent('non-existent')

      expect(content).toBeNull()
    })
  })

  describe('listArtifactsByRun', () => {
    it('should list artifacts for a run', async () => {
      const mockArtifacts: ArtifactEntity[] = [
        {
          id: 'artifact-1',
          organizationId: 'org-123',
          runId: 'run-456',
          filePath: 'plan.md',
          content: 'content',
          createdAt: new Date(),
        },
        {
          id: 'artifact-2',
          organizationId: 'org-123',
          runId: 'run-456',
          filePath: 'implementation.md',
          content: 'content 2',
          createdAt: new Date(),
        },
      ]

      mockRepository.findByRunId.mockResolvedValue(mockArtifacts)

      const artifacts = await manager.listArtifactsByRun('run-456')

      expect(artifacts).toEqual(mockArtifacts)
      expect(mockRepository.findByRunId).toHaveBeenCalledWith('run-456')
    })

    it('should return empty array if no artifacts', async () => {
      mockRepository.findByRunId.mockResolvedValue([])

      const artifacts = await manager.listArtifactsByRun('run-456')

      expect(artifacts).toEqual([])
    })
  })

  describe('listArtifactsByOrganization', () => {
    it('should list artifacts for an organization', async () => {
      const mockArtifacts: ArtifactEntity[] = [
        {
          id: 'artifact-1',
          organizationId: 'org-123',
          runId: 'run-456',
          filePath: 'plan.md',
          content: 'content',
          createdAt: new Date(),
        },
      ]

      mockRepository.findByOrganization.mockResolvedValue(mockArtifacts)

      const artifacts = await manager.listArtifactsByOrganization('org-123')

      expect(artifacts).toEqual(mockArtifacts)
      expect(mockRepository.findByOrganization).toHaveBeenCalledWith('org-123')
    })
  })

  describe('deleteArtifact', () => {
    it('should delete artifact', async () => {
      await manager.deleteArtifact('artifact-123')

      expect(mockRepository.delete).toHaveBeenCalledWith('artifact-123')
    })
  })
})
