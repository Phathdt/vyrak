import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ArtifactManager } from './artifact-manager.service'

import type { ArtifactEntity, IArtifactRepository, IS3StorageProvider } from '../../domain'

describe('ArtifactManager', () => {
  let manager: ArtifactManager
  let mockRepository: {
    create: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    findByRunId: ReturnType<typeof vi.fn>
    findByOrganization: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  let mockS3Provider: {
    upload: ReturnType<typeof vi.fn>
    download: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    generateKey: ReturnType<typeof vi.fn>
    generatePresignedUrl: ReturnType<typeof vi.fn>
    getBucket: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByRunId: vi.fn(),
      findByOrganization: vi.fn(),
      delete: vi.fn(),
    }

    mockS3Provider = {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      generateKey: vi.fn(),
      generatePresignedUrl: vi.fn(),
      getBucket: vi.fn().mockReturnValue('test-bucket'),
    }

    manager = new ArtifactManager(
      mockRepository as unknown as IArtifactRepository,
      mockS3Provider as unknown as IS3StorageProvider
    )
  })

  describe('saveArtifact', () => {
    it('should upload to S3 and save metadata', async () => {
      const params = {
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'test-plan.md',
        content: '# Test Plan\n\nTest content',
      }

      const s3Key = 'org-123/run-456/test-plan.md'
      mockS3Provider.generateKey.mockReturnValue(s3Key)
      mockS3Provider.upload.mockResolvedValue(undefined)

      const mockArtifact: ArtifactEntity = {
        id: 'artifact-123',
        organizationId: params.organizationId,
        runId: params.runId,
        filePath: params.filePath,
        s3Bucket: 'test-bucket',
        s3Key,
        contentSize: 100,
        contentType: 'text/plain',
        content: '',
        createdAt: new Date(),
      }

      mockRepository.create.mockResolvedValue(mockArtifact)

      const artifactId = await manager.saveArtifact(params)

      expect(artifactId).toBe('artifact-123')

      // Verify S3 operations
      expect(mockS3Provider.generateKey).toHaveBeenCalledWith('org-123', 'run-456', 'test-plan.md')
      expect(mockS3Provider.upload).toHaveBeenCalledWith(s3Key, params.content, 'text/plain')

      // Verify repository called with metadata
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: params.organizationId,
          runId: params.runId,
          filePath: params.filePath,
          s3Bucket: 'test-bucket',
          s3Key,
          contentSize: expect.any(Number),
          contentType: 'text/plain',
        })
      )
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

      mockS3Provider.generateKey.mockReturnValue('org-123/run-456/large-plan.md')
      mockS3Provider.upload.mockResolvedValue(undefined)
      mockRepository.create.mockResolvedValue({
        id: 'artifact-123',
        organizationId: params.organizationId,
        runId: params.runId,
        filePath: params.filePath,
        content: params.content,
        s3Bucket: 'test-bucket',
        s3Key: 'test-key',
        contentSize: largeContent.length,
        contentType: 'text/plain',
        createdAt: new Date(),
      })

      await manager.saveArtifact(params)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Large artifact detected'))

      consoleSpy.mockRestore()
    })
  })

  describe('getArtifact', () => {
    it('should return artifact metadata only', async () => {
      const mockMetadata: ArtifactEntity = {
        id: 'artifact-123',
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'test-plan.md',
        s3Bucket: 'test-bucket',
        s3Key: 'org-123/run-456/test-plan.md',
        contentSize: 100,
        contentType: 'text/plain',
        content: '',
        createdAt: new Date(),
      }

      mockRepository.findById.mockResolvedValue(mockMetadata)

      const artifact = await manager.getArtifact('artifact-123')

      expect(artifact).toBeDefined()
      expect(artifact?.id).toBe('artifact-123')
      expect(artifact?.s3Key).toBe('org-123/run-456/test-plan.md')
      expect(mockS3Provider.download).not.toHaveBeenCalled() // Metadata only, no content download
    })

    it('should return null if artifact not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const artifact = await manager.getArtifact('non-existent')

      expect(artifact).toBeNull()
      expect(mockS3Provider.download).not.toHaveBeenCalled()
    })
  })

  describe('getArtifactContent', () => {
    it('should return content from S3', async () => {
      const mockMetadata: ArtifactEntity = {
        id: 'artifact-123',
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'test.md',
        s3Bucket: 'test-bucket',
        s3Key: 'org-123/run-456/test.md',
        contentSize: 50,
        contentType: 'text/plain',
        content: '',
        createdAt: new Date(),
      }

      mockRepository.findById.mockResolvedValue(mockMetadata)
      mockS3Provider.download.mockResolvedValue('Test content from S3')

      const content = await manager.getArtifactContent('artifact-123')

      expect(content).toBe('Test content from S3')
      expect(mockS3Provider.download).toHaveBeenCalledWith('org-123/run-456/test.md')
    })

    it('should return null if artifact not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      const content = await manager.getArtifactContent('non-existent')

      expect(content).toBeNull()
    })
  })

  describe('listArtifactsByRun', () => {
    it('should list artifacts metadata without content', async () => {
      const mockArtifacts: ArtifactEntity[] = [
        {
          id: 'artifact-1',
          organizationId: 'org-123',
          runId: 'run-456',
          filePath: 'plan.md',
          s3Bucket: 'test-bucket',
          s3Key: 'org-123/run-456/plan.md',
          contentSize: 100,
          contentType: 'text/plain',
          content: '',
          createdAt: new Date(),
        },
        {
          id: 'artifact-2',
          organizationId: 'org-123',
          runId: 'run-456',
          filePath: 'implementation.md',
          s3Bucket: 'test-bucket',
          s3Key: 'org-123/run-456/implementation.md',
          contentSize: 150,
          contentType: 'text/plain',
          content: '',
          createdAt: new Date(),
        },
      ]

      mockRepository.findByRunId.mockResolvedValue(mockArtifacts)

      const artifacts = await manager.listArtifactsByRun('run-456')

      expect(artifacts).toEqual(mockArtifacts)
      expect(mockS3Provider.download).not.toHaveBeenCalled() // No content fetched for list
    })
  })

  describe('generateUploadUrl', () => {
    it('should generate pre-signed URL', async () => {
      const params = {
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'test.md',
        contentType: 'text/plain',
      }

      const s3Key = 'org-123/run-456/test.md'
      mockS3Provider.generateKey.mockReturnValue(s3Key)
      mockS3Provider.generatePresignedUrl.mockResolvedValue({
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        s3Key,
        bucket: 'test-bucket',
        expiresIn: 3600,
      })

      const result = await manager.generateUploadUrl(params)

      expect(result.uploadUrl).toBe('https://s3.amazonaws.com/presigned-url')
      expect(result.s3Key).toBe(s3Key)
      expect(result.bucket).toBe('test-bucket')
      expect(mockS3Provider.generateKey).toHaveBeenCalledWith('org-123', 'run-456', 'test.md')
      expect(mockS3Provider.generatePresignedUrl).toHaveBeenCalledWith(s3Key, 'text/plain', 3600)
    })
  })

  describe('confirmUpload', () => {
    it('should save artifact metadata after upload', async () => {
      const params = {
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'test.md',
        s3Key: 'org-123/run-456/test.md',
        s3Bucket: 'test-bucket',
        contentSize: 100,
        contentType: 'text/plain',
      }

      const mockArtifact: ArtifactEntity = {
        id: 'artifact-123',
        ...params,
        content: '',
        createdAt: new Date(),
      }

      mockRepository.create.mockResolvedValue(mockArtifact)

      const artifactId = await manager.confirmUpload(params)

      expect(artifactId).toBe('artifact-123')
      expect(mockRepository.create).toHaveBeenCalledWith(params)
    })
  })

  describe('deleteArtifact', () => {
    it('should delete from S3 and database', async () => {
      const mockMetadata: ArtifactEntity = {
        id: 'artifact-123',
        organizationId: 'org-123',
        runId: 'run-456',
        filePath: 'to-delete.md',
        s3Bucket: 'test-bucket',
        s3Key: 'org-123/run-456/to-delete.md',
        contentSize: 50,
        contentType: 'text/plain',
        content: '',
        createdAt: new Date(),
      }

      mockRepository.findById.mockResolvedValue(mockMetadata)
      mockS3Provider.delete.mockResolvedValue(undefined)
      mockRepository.delete.mockResolvedValue(undefined)

      await manager.deleteArtifact('artifact-123')

      expect(mockS3Provider.delete).toHaveBeenCalledWith('org-123/run-456/to-delete.md')
      expect(mockRepository.delete).toHaveBeenCalledWith('artifact-123')
    })

    it('should do nothing if artifact not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await manager.deleteArtifact('non-existent')

      expect(mockS3Provider.delete).not.toHaveBeenCalled()
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })
})
