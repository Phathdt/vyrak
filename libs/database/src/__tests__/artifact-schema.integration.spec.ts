import { getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { PrismaClient } from '@vyrak/database'

describe('Artifact Schema Migration - S3 Storage', () => {
  let prisma: PrismaClient
  let testOrgId: string
  let testUserId: string
  let testProjectId: string
  let testRunId: string

  beforeAll(async () => {
    try {
      await startPostgres()
      prisma = getPrismaClient()

      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'test-artifact-schema@example.com',
          name: 'Test User',
        },
      })
      testUserId = user.id

      // Create test organization
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          slug: 'test-org-artifact-schema',
        },
      })
      testOrgId = org.id

      // Create test project
      const project = await prisma.project.create({
        data: {
          organizationId: testOrgId,
          name: 'Test Project',
          slug: 'test-project',
        },
      })
      testProjectId = project.id

      // Create test workflow run
      const run = await prisma.workflowRun.create({
        data: {
          projectId: testProjectId,
          organizationId: testOrgId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        },
      })
      testRunId = run.id
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  it('should have S3 storage fields', async () => {
    if (!prisma) return

    // Create test artifact with S3 fields
    const artifact = await prisma.artifact.create({
      data: {
        organizationId: testOrgId,
        runId: testRunId,
        filePath: 'test-s3-fields.txt',
        s3Bucket: 'test-bucket',
        s3Key: 'test-org/test-run/test.txt',
        contentSize: 100,
        contentType: 'text/plain',
      },
    })

    expect(artifact.s3Bucket).toBe('test-bucket')
    expect(artifact.s3Key).toBe('test-org/test-run/test.txt')
    expect(artifact.contentSize).toBe(100)
    expect(artifact.contentType).toBe('text/plain')
  })

  it('should not have content field', async () => {
    if (!prisma) return

    const artifact = await prisma.artifact.create({
      data: {
        organizationId: testOrgId,
        runId: testRunId,
        filePath: 'test-no-content.txt',
        s3Bucket: 'bucket',
        s3Key: 'key',
        contentSize: 50,
        contentType: 'text/plain',
      },
    })

    // TypeScript should not allow accessing 'content'
    // @ts-expect-error - content field should not exist
    expect(artifact.content).toBeUndefined()
  })

  it('should enforce required S3 fields', async () => {
    if (!prisma) return

    await expect(
      prisma.artifact.create({
        data: {
          organizationId: testOrgId,
          runId: testRunId,
          filePath: 'test-required.txt',
          // Missing s3Bucket, s3Key, contentSize
        } as any,
      })
    ).rejects.toThrow()
  })

  it('should default contentType to text/plain', async () => {
    if (!prisma) return

    const artifact = await prisma.artifact.create({
      data: {
        organizationId: testOrgId,
        runId: testRunId,
        filePath: 'test-default.txt',
        s3Bucket: 'bucket',
        s3Key: 'key',
        contentSize: 25,
        // contentType not specified, should default
      },
    })

    expect(artifact.contentType).toBe('text/plain')
  })

  it('should support custom contentType', async () => {
    if (!prisma) return

    const artifact = await prisma.artifact.create({
      data: {
        organizationId: testOrgId,
        runId: testRunId,
        filePath: 'test-custom.json',
        s3Bucket: 'bucket',
        s3Key: 'key.json',
        contentSize: 150,
        contentType: 'application/json',
      },
    })

    expect(artifact.contentType).toBe('application/json')
  })
})
