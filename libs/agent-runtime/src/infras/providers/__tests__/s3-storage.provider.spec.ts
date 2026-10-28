import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'

import { S3StorageProvider } from '../s3-storage.provider'

describe('S3StorageProvider', () => {
  const s3Mock = mockClient(S3Client)
  let provider: S3StorageProvider

  beforeEach(() => {
    s3Mock.reset()
    provider = new S3StorageProvider(s3Mock as unknown as S3Client, 'test-bucket')
  })

  describe('upload', () => {
    it('should upload content to S3', async () => {
      s3Mock.on(PutObjectCommand).resolves({})

      await provider.upload('org-123/run-456/test.md', 'Test content')

      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1)
      const call = s3Mock.commandCalls(PutObjectCommand)[0]
      expect(call.args[0].input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'org-123/run-456/test.md',
        Body: 'Test content',
        ContentType: 'text/plain',
      })
    })

    it('should upload with custom content type', async () => {
      s3Mock.on(PutObjectCommand).resolves({})

      await provider.upload('org-123/run-456/test.json', '{"key":"value"}', 'application/json')

      const call = s3Mock.commandCalls(PutObjectCommand)[0]
      expect(call.args[0].input.ContentType).toBe('application/json')
    })

    it('should throw S3StorageError on upload failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 error'))

      await expect(provider.upload('test-key', 'content')).rejects.toThrow('Failed to upload to S3: test-key')
    })
  })

  describe('download', () => {
    it('should download content from S3', async () => {
      const mockBody = {
        transformToString: async () => 'Downloaded content',
      }

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockBody as any,
      })

      const content = await provider.download('org-123/run-456/test.md')

      expect(content).toBe('Downloaded content')
      expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(1)
      const call = s3Mock.commandCalls(GetObjectCommand)[0]
      expect(call.args[0].input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'org-123/run-456/test.md',
      })
    })

    it('should throw S3StorageError when body is missing', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: undefined,
      })

      await expect(provider.download('test-key')).rejects.toThrow('Failed to download from S3')
    })

    it('should throw S3StorageError on download failure', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'))

      await expect(provider.download('test-key')).rejects.toThrow('Failed to download from S3: test-key')
    })
  })

  describe('delete', () => {
    it('should delete object from S3', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({})

      await provider.delete('org-123/run-456/test.md')

      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1)
      const call = s3Mock.commandCalls(DeleteObjectCommand)[0]
      expect(call.args[0].input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'org-123/run-456/test.md',
      })
    })

    it('should throw S3StorageError on delete failure', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 error'))

      await expect(provider.delete('test-key')).rejects.toThrow('Failed to delete from S3: test-key')
    })
  })

  describe('generateKey', () => {
    it('should generate S3 key from parameters', () => {
      const key = provider.generateKey('org-123', 'run-456', 'test-plan.md')
      expect(key).toBe('org-123/run-456/test-plan.md')
    })

    it('should handle file paths with directories', () => {
      const key = provider.generateKey('org-123', 'run-456', 'artifacts/plan.md')
      expect(key).toBe('org-123/run-456/artifacts/plan.md')
    })
  })
})
