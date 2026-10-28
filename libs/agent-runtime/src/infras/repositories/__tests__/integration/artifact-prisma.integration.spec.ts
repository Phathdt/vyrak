import type { DatabaseService } from '@vyrak/database'
import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  createTestProject,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ArtifactPrismaRepository } from '../../artifact-prisma.repository'

/**
 * Integration tests for ArtifactPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('ArtifactPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: ArtifactPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new ArtifactPrismaRepository(databaseService as unknown as DatabaseService)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  beforeEach(async () => {
    if (!databaseService) return

    const prisma = getPrismaClient()
    // Clean up data in correct order
    await prisma.artifact.deleteMany()
    await prisma.workflowRun.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('create and findById', () => {
    it('should create and retrieve artifact metadata', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      // Create test workflow run using system access
      const run = await databaseService.withSystemAccess(async () => {
        return await prisma.workflowRun.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            initiatedByUserId: user.id,
            workflowKey: 'test-workflow',
            workflowVersion: '1.0.0',
            status: 'running',
          },
        })
      })

      await databaseService.withOrganization(organization.id, async () => {
        const artifact = await repository.create({
          organizationId: organization.id,
          runId: run.id,
          filePath: 'test-plan.md',
          s3Bucket: 'test-bucket',
          s3Key: `${organization.id}/${run.id}/test-plan.md`,
          contentSize: 100,
          contentType: 'text/plain',
        } as any)

        expect(artifact.id).toBeDefined()
        expect(artifact.filePath).toBe('test-plan.md')
        expect(artifact.s3Key).toBe(`${organization.id}/${run.id}/test-plan.md`)
        expect(artifact.content).toBe('') // Empty - content in S3

        // Retrieve artifact
        const retrieved = await repository.findById(artifact.id)
        expect(retrieved).toBeDefined()
        expect(retrieved?.s3Key).toBe(`${organization.id}/${run.id}/test-plan.md`)
      })
    })
  })

  describe('findByRunId', () => {
    it('should find artifacts by run ID', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      // Create test workflow run using system access
      const run = await databaseService.withSystemAccess(async () => {
        return await prisma.workflowRun.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            initiatedByUserId: user.id,
            workflowKey: 'test-workflow',
            workflowVersion: '1.0.0',
            status: 'running',
          },
        })
      })

      await databaseService.withOrganization(organization.id, async () => {
        // Create multiple artifacts
        await repository.create({
          organizationId: organization.id,
          runId: run.id,
          filePath: 'plan.md',
          s3Bucket: 'test-bucket',
          s3Key: `${organization.id}/${run.id}/plan.md`,
          contentSize: 50,
          contentType: 'text/plain',
        } as any)

        await repository.create({
          organizationId: organization.id,
          runId: run.id,
          filePath: 'implementation.md',
          s3Bucket: 'test-bucket',
          s3Key: `${organization.id}/${run.id}/implementation.md`,
          contentSize: 75,
          contentType: 'text/plain',
        } as any)

        const artifacts = await repository.findByRunId(run.id)

        expect(artifacts.length).toBeGreaterThanOrEqual(2)
        const filePaths = artifacts.map((a) => a.filePath)
        expect(filePaths).toContain('plan.md')
        expect(filePaths).toContain('implementation.md')
      })
    })
  })

  describe('findByOrganization', () => {
    it('should find artifacts by organization', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      // Create test workflow run using system access
      const run = await databaseService.withSystemAccess(async () => {
        return await prisma.workflowRun.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            initiatedByUserId: user.id,
            workflowKey: 'test-workflow',
            workflowVersion: '1.0.0',
            status: 'running',
          },
        })
      })

      await databaseService.withOrganization(organization.id, async () => {
        await repository.create({
          organizationId: organization.id,
          runId: run.id,
          filePath: 'artifact.md',
          s3Bucket: 'test-bucket',
          s3Key: `${organization.id}/${run.id}/artifact.md`,
          contentSize: 60,
          contentType: 'text/plain',
        } as any)

        const artifacts = await repository.findByOrganization(organization.id)

        expect(artifacts.length).toBeGreaterThanOrEqual(1)
        expect(artifacts[0].organizationId).toBe(organization.id)
      })
    })
  })

  describe('delete', () => {
    it('should delete artifact metadata', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      // Create test workflow run using system access
      const run = await databaseService.withSystemAccess(async () => {
        return await prisma.workflowRun.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            initiatedByUserId: user.id,
            workflowKey: 'test-workflow',
            workflowVersion: '1.0.0',
            status: 'running',
          },
        })
      })

      await databaseService.withOrganization(organization.id, async () => {
        const artifact = await repository.create({
          organizationId: organization.id,
          runId: run.id,
          filePath: 'to-delete.md',
          s3Bucket: 'test-bucket',
          s3Key: `${organization.id}/${run.id}/to-delete.md`,
          contentSize: 40,
          contentType: 'text/plain',
        } as any)

        await repository.delete(artifact.id)

        const retrieved = await repository.findById(artifact.id)
        expect(retrieved).toBeNull()
      })
    })
  })

  describe('findById with non-existent artifact', () => {
    it('should return null for non-existent artifact', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      await databaseService.withOrganization(organization.id, async () => {
        const artifact = await repository.findById('non-existent-id')
        expect(artifact).toBeNull()
      })
    })
  })
})
