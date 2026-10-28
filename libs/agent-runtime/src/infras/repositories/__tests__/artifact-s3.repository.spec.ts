import { Readable } from 'stream'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ArtifactS3Repository } from '../artifact-s3.repository'

const s3Mock = mockClient(S3Client)

describe('ArtifactS3Repository', () => {
  const mockDb = {
    client: {
      artifact: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
      },
    },
  }

  const s3Client = new S3Client({ region: 'us-east-1' })
  const repository = new ArtifactS3Repository(mockDb as any, s3Client, 'test-bucket')

  beforeEach(() => {
    s3Mock.reset()
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should upload to S3 and save metadata', async () => {
      const params = {
        organizationId: 'org-1',
        runId: 'run-1',
        filePath: 'plan.md',
        content: 'Test content',
      }

      mockDb.client.artifact.create.mockResolvedValue({
        id: 'artifact-1',
        organizationId: 'org-1',
        runId: 'run-1',
        filePath: 'plan.md',
        s3Bucket: 'test-bucket',
        s3Key: 'org-1/run-1/plan.md',
        contentSize: 12,
        contentType: 'text/plain',
        createdAt: new Date(),
      })

      s3Mock.on(PutObjectCommand).resolves({})

      const result = await repository.create(params)

      expect(result.id).toBe('artifact-1')
      expect(result.s3Key).toBe('org-1/run-1/plan.md')
      expect(result.content).toBe('Test content')
      expect(s3Mock.calls()).toHaveLength(1)
      expect(mockDb.client.artifact.create).toHaveBeenCalled()
    })

    it('should throw on S3 upload failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 error'))

      await expect(
        repository.create({
          organizationId: 'org-1',
          runId: 'run-1',
          filePath: 'test.txt',
          content: 'content',
        })
      ).rejects.toThrow('Failed to create artifact')
    })
  })

  describe('findById', () => {
    it('should fetch metadata from DB and content from S3', async () => {
      mockDb.client.artifact.findUnique.mockResolvedValue({
        id: 'artifact-1',
        organizationId: 'org-1',
        runId: 'run-1',
        filePath: 'plan.md',
        s3Bucket: 'test-bucket',
        s3Key: 'org-1/run-1/plan.md',
        contentSize: 12,
        contentType: 'text/plain',
        createdAt: new Date(),
      })

      const stream = Readable.from(['S3 content'])
      const mockBody = {
        transformToString: async () => 'S3 content',
      }
      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
      })

      const result = await repository.findById('artifact-1')

      expect(result).toBeDefined()
      expect(result!.content).toBe('S3 content')
      expect(s3Mock.calls()).toHaveLength(1)
    })

    it('should return null when artifact not found', async () => {
      mockDb.client.artifact.findUnique.mockResolvedValue(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('findByRunId', () => {
    it('should return metadata only without content', async () => {
      mockDb.client.artifact.findMany.mockResolvedValue([
        {
          id: 'artifact-1',
          organizationId: 'org-1',
          runId: 'run-1',
          filePath: 'plan.md',
          s3Bucket: 'test-bucket',
          s3Key: 'org-1/run-1/plan.md',
          contentSize: 100,
          contentType: 'text/plain',
          createdAt: new Date(),
        },
      ])

      const results = await repository.findByRunId('run-1')

      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('') // Empty for list operations
      expect(s3Mock.calls()).toHaveLength(0) // No S3 calls
    })
  })

  describe('findByOrganization', () => {
    it('should return metadata only without content', async () => {
      mockDb.client.artifact.findMany.mockResolvedValue([
        {
          id: 'artifact-1',
          organizationId: 'org-1',
          runId: 'run-1',
          filePath: 'plan.md',
          s3Bucket: 'test-bucket',
          s3Key: 'org-1/run-1/plan.md',
          contentSize: 100,
          contentType: 'text/plain',
          createdAt: new Date(),
        },
      ])

      const results = await repository.findByOrganization('org-1')

      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('') // Empty for list operations
      expect(s3Mock.calls()).toHaveLength(0) // No S3 calls
    })
  })

  describe('delete', () => {
    it('should delete from S3 and DB', async () => {
      mockDb.client.artifact.findUnique.mockResolvedValue({
        id: 'artifact-1',
        s3Bucket: 'test-bucket',
        s3Key: 'org-1/run-1/plan.md',
      })

      s3Mock.on(DeleteObjectCommand).resolves({})
      mockDb.client.artifact.delete.mockResolvedValue({})

      await repository.delete('artifact-1')

      expect(s3Mock.calls()).toHaveLength(1)
      expect(mockDb.client.artifact.delete).toHaveBeenCalledWith({
        where: { id: 'artifact-1' },
      })
    })
  })
})
