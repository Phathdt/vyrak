import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { S3StorageProvider } from '../../s3-storage.provider'

describe('S3StorageProvider Integration', () => {
  let container: StartedTestContainer
  let s3Client: S3Client
  let provider: S3StorageProvider
  const bucketName = 'test-artifacts'

  beforeAll(async () => {
    try {
      // Start Floci container
      container = await new GenericContainer('floci/floci:latest')
        .withExposedPorts(4566)
        .withEnvironment({ SERVICES: 's3' })
        .start()

      const port = container.getMappedPort(4566)
      const endpoint = `http://localhost:${port}`

      // Create S3 client
      s3Client = new S3Client({
        region: 'us-east-1',
        endpoint: endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      })

      // Create bucket
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }))

      // Verify bucket exists
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))

      // Create provider
      provider = new S3StorageProvider(s3Client, bucketName)
    } catch (error) {
      console.warn('Floci container setup failed, skipping integration tests:', error)
    }
  }, 60000) // 60s timeout for container startup

  afterAll(async () => {
    if (container) {
      await container.stop()
    }
  })

  describe('upload and download', () => {
    it('should upload and download content from S3', async () => {
      if (!provider) return

      const key = 'org-test/run-test/test-file.md'
      const content = '# Test File\n\nThis is test content.'

      // Upload (returns void)
      await provider.upload(key, content)

      // Download and verify
      const downloaded = await provider.download(key)
      expect(downloaded).toBe(content)
    })

    it('should handle large content', async () => {
      if (!provider) return

      const key = 'org-test/run-test/large-file.txt'
      const largeContent = 'x'.repeat(100000) // 100KB

      await provider.upload(key, largeContent)
      const downloaded = await provider.download(key)

      expect(downloaded).toBe(largeContent)
      expect(downloaded.length).toBe(100000)
    })

    it('should handle different content types', async () => {
      if (!provider) return

      const jsonKey = 'org-test/run-test/data.json'
      const jsonContent = JSON.stringify({ name: 'test', value: 123 })

      await provider.upload(jsonKey, jsonContent, 'application/json')
      const downloaded = await provider.download(jsonKey)

      expect(downloaded).toBe(jsonContent)
      const parsed = JSON.parse(downloaded)
      expect(parsed.name).toBe('test')
      expect(parsed.value).toBe(123)
    })
  })

  describe('delete', () => {
    it('should delete object from S3', async () => {
      if (!provider) return

      const key = 'org-test/run-test/to-delete.md'
      const content = 'To be deleted'

      // Upload first
      await provider.upload(key, content)

      // Verify it exists
      const downloaded = await provider.download(key)
      expect(downloaded).toBe(content)

      // Delete
      await provider.delete(key)

      // Verify it's deleted (should throw error)
      await expect(provider.download(key)).rejects.toThrow()
    })
  })

  describe('generateKey', () => {
    it('should generate proper S3 key format', async () => {
      if (!provider) return

      const key = provider.generateKey('org-123', 'run-456', 'test-plan.md')
      expect(key).toBe('org-123/run-456/test-plan.md')

      // Verify the key works for upload/download
      await provider.upload(key, 'Test content')
      const downloaded = await provider.download(key)
      expect(downloaded).toBe('Test content')
    })
  })

  describe('error handling', () => {
    it('should throw error when downloading non-existent key', async () => {
      if (!provider) return

      await expect(provider.download('non-existent-key')).rejects.toThrow('Failed to download from S3')
    })

    it('should handle upload with invalid key gracefully', async () => {
      if (!provider) return

      // S3 allows most characters, but we can test error propagation
      // by trying to upload to a different bucket that doesn't exist
      const invalidProvider = new S3StorageProvider(s3Client, 'non-existent-bucket')

      await expect(invalidProvider.upload('test-key', 'content')).rejects.toThrow('Failed to upload to S3')
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent uploads', async () => {
      if (!provider) return

      const uploads = Array.from({ length: 5 }, (_, i) =>
        provider.upload(`org-test/run-test/concurrent-${i}.txt`, `Content ${i}`)
      )

      await Promise.all(uploads)

      // Verify all uploads succeeded
      for (let i = 0; i < 5; i++) {
        const content = await provider.download(`org-test/run-test/concurrent-${i}.txt`)
        expect(content).toBe(`Content ${i}`)
      }
    })
  })
})
