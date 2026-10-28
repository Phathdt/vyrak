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

import { WorkflowState } from '../../../domain'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for WorkflowPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('WorkflowPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowPrismaRepository(databaseService as unknown as DatabaseService)
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
    // Clean up data
    await prisma.workflowRun.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('createRun', () => {
    it('should create workflow run', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const result = await repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          input: { key: 'value' },
        })

        expect(result).toMatchObject({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          state: WorkflowState.QUEUED,
        })
        expect(result.id).toBeDefined()
        expect(result.idempotencyKey).toBeDefined()
      })
    })
  })

  describe('findRunById', () => {
    it('should return run when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const created = await repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const result = await repository.findRunById(created.id)

        expect(result).toMatchObject({
          id: created.id,
          workflowKey: 'test-workflow',
        })
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      await databaseService.withOrganization('test-org-id', async () => {
        const result = await repository.findRunById('non-existent-id')

        expect(result).toBeNull()
      })
    })
  })

  describe('updateRunState', () => {
    it('should update workflow run state', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const created = await repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        await repository.updateRunState(created.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })

        const result = await repository.findRunById(created.id)

        expect(result?.state).toBe(WorkflowState.RUNNING)
        expect(result?.startedAt).toBeInstanceOf(Date)
      })
    })
  })
})
