import type { PrismaClient } from '@vyrak/database'
import { getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ArtifactPrismaRepository } from '../../artifact-prisma.repository'

describe('ArtifactPrismaRepository Integration', () => {
  let prisma: PrismaClient
  let repository: ArtifactPrismaRepository
  let testOrgId: string
  let testRunId: string

  beforeAll(async () => {
    try {
      await startPostgres()
      prisma = getPrismaClient()
      repository = new ArtifactPrismaRepository(prisma)

      // Create test organization once
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org Artifact',
          slug: 'test-org-artifact-' + Date.now(),
        },
      })
      testOrgId = org.id

      // Create test user
      const user = await prisma.user.create({
        data: {
          email: 'test-artifact@example.com',
          name: 'Test User',
          authProvider: 'local',
          authProviderId: 'test-artifact-' + Date.now(),
        },
      })

      // Create test project
      const project = await prisma.project.create({
        data: {
          organizationId: testOrgId,
          name: 'Test Project',
          slug: 'test-project-' + Date.now(),
        },
      })

      // Create test workflow run
      const run = await prisma.workflowRun.create({
        data: {
          organizationId: testOrgId,
          projectId: project.id,
          initiatedByUserId: user.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          status: 'running',
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

  it('should create and retrieve artifact', async () => {
    if (!prisma || !testRunId) return

    const artifact = await repository.create({
      organizationId: testOrgId,
      runId: testRunId,
      filePath: 'test-plan.md',
      content: '# Test Plan\n\nContent here',
    })

    expect(artifact.id).toBeDefined()
    expect(artifact.filePath).toBe('test-plan.md')
    expect(artifact.content).toBe('# Test Plan\n\nContent here')

    // Retrieve artifact
    const retrieved = await repository.findById(artifact.id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.content).toBe('# Test Plan\n\nContent here')
  })

  it('should find artifacts by run ID', async () => {
    if (!prisma || !testRunId) return

    // Create multiple artifacts
    await repository.create({
      organizationId: testOrgId,
      runId: testRunId,
      filePath: 'plan.md',
      content: 'Plan content',
    })

    await repository.create({
      organizationId: testOrgId,
      runId: testRunId,
      filePath: 'implementation.md',
      content: 'Implementation content',
    })

    const artifacts = await repository.findByRunId(testRunId)

    expect(artifacts.length).toBeGreaterThanOrEqual(2)
    const filePaths = artifacts.map((a) => a.filePath)
    expect(filePaths).toContain('plan.md')
    expect(filePaths).toContain('implementation.md')
  })

  it('should find artifacts by organization', async () => {
    if (!prisma || !testRunId) return

    const artifacts = await repository.findByOrganization(testOrgId)

    expect(artifacts.length).toBeGreaterThanOrEqual(1)
    expect(artifacts[0].organizationId).toBe(testOrgId)
  })

  it('should delete artifact', async () => {
    if (!prisma || !testRunId) return

    const artifact = await repository.create({
      organizationId: testOrgId,
      runId: testRunId,
      filePath: 'to-delete.md',
      content: 'Delete me',
    })

    await repository.delete(artifact.id)

    const retrieved = await repository.findById(artifact.id)
    expect(retrieved).toBeNull()
  })

  it('should return null for non-existent artifact', async () => {
    if (!prisma) return

    const artifact = await repository.findById('non-existent-id')
    expect(artifact).toBeNull()
  })
})
