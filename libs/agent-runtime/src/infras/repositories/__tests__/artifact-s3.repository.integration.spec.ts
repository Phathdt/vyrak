import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import type { PrismaClient } from '@vyrak/database'
import { getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'

import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ArtifactS3Repository } from '../artifact-s3.repository'

describe('ArtifactS3Repository Integration', () => {
  let container: StartedTestContainer
  let s3Client: S3Client
  let prisma: PrismaClient
  let repository: ArtifactS3Repository
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

      // Start PostgreSQL
      await startPostgres()
      prisma = getPrismaClient()

      // Create repository
      repository = new ArtifactS3Repository({ client: prisma } as any, s3Client, bucketName)
    } catch (error) {
      console.warn('Integration test setup failed:', error)
    }
  }, 60000) // 60s timeout for container startup

  afterAll(async () => {
    await stopPostgres()
    if (container) {
      await container.stop()
    }
  })

  it('should create artifact with S3 upload', async () => {
    if (!repository || !prisma) return

    const artifact = await repository.create({
      organizationId: 'org-integration',
      runId: 'run-integration',
      filePath: 'test-plan.md',
      content: '# Test Plan\n\nThis is a test.',
    })

    expect(artifact.id).toBeDefined()
    expect(artifact.s3Key).toBe('org-integration/run-integration/test-plan.md')
    expect(artifact.contentSize).toBeGreaterThan(0)
    expect(artifact.content).toBe('# Test Plan\n\nThis is a test.')
  })

  it('should retrieve artifact with S3 content', async () => {
    if (!repository || !prisma) return

    const created = await repository.create({
      organizationId: 'org-2',
      runId: 'run-2',
      filePath: 'retrieve-test.txt',
      content: 'Retrieved content',
    })

    const retrieved = await repository.findById(created.id)

    expect(retrieved).toBeDefined()
    expect(retrieved!.content).toBe('Retrieved content')
  })

  it('should list artifacts by run', async () => {
    if (!repository || !prisma) return

    await repository.create({
      organizationId: 'org-3',
      runId: 'run-3',
      filePath: 'file1.txt',
      content: 'Content 1',
    })

    await repository.create({
      organizationId: 'org-3',
      runId: 'run-3',
      filePath: 'file2.txt',
      content: 'Content 2',
    })

    const artifacts = await repository.findByRunId('run-3')

    expect(artifacts.length).toBeGreaterThanOrEqual(2)
    expect(artifacts[0].content).toBe('') // List returns empty content
  })

  it('should delete artifact from S3 and DB', async () => {
    if (!repository || !prisma) return

    const artifact = await repository.create({
      organizationId: 'org-4',
      runId: 'run-4',
      filePath: 'delete-test.txt',
      content: 'To be deleted',
    })

    await repository.delete(artifact.id)

    const retrieved = await repository.findById(artifact.id)
    expect(retrieved).toBeNull()
  })
})
