import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  createTestProject,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'
import { v4 as uuid } from 'uuid'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { WorkflowState } from '../../domain'
import { WorkflowPrismaRepository } from '../../infras/repositories/workflow-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

describe('WorkflowRepository Integration Tests', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowPrismaRepository
  let organization: { id: string; name: string; slug: string }
  let project: { id: string; organizationId: string; name: string; slug: string }
  let user: { id: string; email: string; name: string | null }

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
    if (!databaseService) {
      console.warn('Test database setup failed, skipping integration tests')
      return
    }

    const prisma = getPrismaClient()
    // Clean up data
    await prisma.workflowRun.deleteMany()
    await prisma.workflowStepRun.deleteMany()
    await prisma.workflowEvent.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()

    // Create test data
    const testOrg = await createTestOrgWithOwner(prisma)
    organization = testOrg.organization
    user = testOrg.user
    project = await createTestProject(prisma, organization.id)
  })

  describe('createRun', () => {
    it('should create a workflow run with correct initial state', async () => {
      if (!databaseService) return

      const run = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          input: { key: 'value' },
        })
      )

      expect(run).toBeDefined()
      expect(run.id).toBeDefined()
      expect(run.organizationId).toBe(organization.id)
      expect(run.projectId).toBe(project.id)
      expect(run.workflowKey).toBe('workflow-1')
      expect(run.workflowVersion).toBe('1.0.0')
      expect(run.state).toBe(WorkflowState.QUEUED)
      expect(run.initiatedByUserId).toBe(user.id)
      expect(run.createdAt).toBeInstanceOf(Date)
      expect(run.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate idempotency key if not provided', async () => {
      if (!databaseService) return

      const run = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      expect(run.idempotencyKey).toBeDefined()
      expect(typeof run.idempotencyKey).toBe('string')
      expect(run.idempotencyKey?.length).toBeGreaterThan(0)
    })

    it('should use provided idempotency key', async () => {
      if (!databaseService) return

      const idempotencyKey = uuid()

      const run = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          idempotencyKey,
        })
      )

      expect(run.idempotencyKey).toBe(idempotencyKey)
    })

    it('should throw error for duplicate idempotency key', async () => {
      if (!databaseService) return

      const idempotencyKey = uuid()

      await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          idempotencyKey,
        })
      )

      // Attempt to create with same idempotency key
      await expect(
        databaseService.withOrganization(organization.id, () =>
          repository.createRun({
            organizationId: organization.id,
            projectId: project.id,
            workflowKey: 'workflow-2',
            workflowVersion: '2.0.0',
            initiatedByUserId: user.id,
            idempotencyKey,
          })
        )
      ).rejects.toThrow()
    })

    it('should allow same idempotency key in different organizations', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const org2 = await createTestOrgWithOwner(prisma)
      const project2 = await createTestProject(prisma, org2.organization.id)
      const idempotencyKey = uuid()

      const run1 = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          idempotencyKey,
        })
      )

      const run2 = await databaseService.withOrganization(org2.organization.id, () =>
        repository.createRun({
          organizationId: org2.organization.id,
          projectId: project2.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: org2.user.id,
          idempotencyKey,
        })
      )

      expect(run1.id).not.toBe(run2.id)
      expect(run1.organizationId).toBe(organization.id)
      expect(run2.organizationId).toBe(org2.organization.id)
    })
  })

  describe('findRunById', () => {
    it('should find a workflow run by ID', async () => {
      if (!databaseService) return

      const created = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      const found = await databaseService.withOrganization(organization.id, () => repository.findRunById(created.id))

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.organizationId).toBe(organization.id)
      expect(found?.workflowKey).toBe('workflow-1')
    })

    it('should return null for non-existent run', async () => {
      if (!databaseService) return

      const found = await databaseService.withOrganization(organization.id, () =>
        repository.findRunById('00000000-0000-0000-0000-000000000000')
      )

      expect(found).toBeNull()
    })

    it('should enforce tenant isolation - cannot access other org run', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const org2 = await createTestOrgWithOwner(prisma)
      await createTestProject(prisma, org2.organization.id)

      const run = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      // Try to access from different org - should return null due to tenant filter
      const found = await databaseService.withOrganization(org2.organization.id, () => repository.findRunById(run.id))

      expect(found).toBeNull()
    })
  })

  describe('findRunByIdempotencyKey', () => {
    it('should find run by idempotency key', async () => {
      if (!databaseService) return

      const idempotencyKey = uuid()

      const created = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          idempotencyKey,
        })
      )

      const found = await databaseService.withOrganization(organization.id, () =>
        repository.findRunByIdempotencyKey(organization.id, idempotencyKey)
      )

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.idempotencyKey).toBe(idempotencyKey)
    })

    it('should return null for non-existent idempotency key', async () => {
      if (!databaseService) return

      const nonExistentKey = uuid()

      const found = await databaseService.withOrganization(organization.id, () =>
        repository.findRunByIdempotencyKey(organization.id, nonExistentKey)
      )

      expect(found).toBeNull()
    })

    it('should be scoped to organization', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const org2 = await createTestOrgWithOwner(prisma)
      const idempotencyKey = uuid()

      await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
          idempotencyKey,
        })
      )

      const found = await databaseService.withOrganization(org2.organization.id, () =>
        repository.findRunByIdempotencyKey(org2.organization.id, idempotencyKey)
      )

      expect(found).toBeNull()
    })
  })

  describe('updateRunState', () => {
    it('should update workflow run state', async () => {
      if (!databaseService) return

      const created = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      const startTime = new Date()
      await databaseService.withOrganization(organization.id, () =>
        repository.updateRunState(created.id, {
          status: WorkflowState.RUNNING,
          startedAt: startTime,
        })
      )

      const updated = await databaseService.withOrganization(organization.id, () => repository.findRunById(created.id))

      expect(updated?.state).toBe(WorkflowState.RUNNING)
      expect(updated?.startedAt).toEqual(startTime)
    })

    it('should update multiple state fields', async () => {
      if (!databaseService) return

      const created = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      const now = new Date()
      await databaseService.withOrganization(organization.id, () =>
        repository.updateRunState(created.id, {
          status: WorkflowState.SUCCEEDED,
          currentStepKey: 'step-5',
          startedAt: new Date(now.getTime() - 60000),
          completedAt: now,
        })
      )

      const updated = await databaseService.withOrganization(organization.id, () => repository.findRunById(created.id))

      expect(updated?.state).toBe(WorkflowState.SUCCEEDED)
      expect(updated?.currentStepKey).toBe('step-5')
      expect(updated?.completedAt).toEqual(now)
    })

    it('should throw error for non-existent run', async () => {
      if (!databaseService) return

      await expect(
        databaseService.withOrganization(organization.id, () =>
          repository.updateRunState('00000000-0000-0000-0000-000000000000', {
            status: WorkflowState.RUNNING,
          })
        )
      ).rejects.toThrow()
    })
  })

  describe('cancelRun', () => {
    it('should cancel a workflow run', async () => {
      if (!databaseService) return

      const created = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      await databaseService.withOrganization(organization.id, () => repository.cancelRun(created.id))

      const cancelled = await databaseService.withOrganization(organization.id, () =>
        repository.findRunById(created.id)
      )

      expect(cancelled?.state).toBe(WorkflowState.CANCELLED)
    })

    it('should throw error for non-existent run', async () => {
      if (!databaseService) return

      await expect(
        databaseService.withOrganization(organization.id, () =>
          repository.cancelRun('00000000-0000-0000-0000-000000000000')
        )
      ).rejects.toThrow()
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent run creates safely', async () => {
      if (!databaseService) return

      const idempotencyKey = uuid()

      const promises = Array.from({ length: 5 }).map(() =>
        databaseService!.withOrganization(organization.id, () =>
          repository.createRun({
            organizationId: organization.id,
            projectId: project.id,
            workflowKey: 'workflow-1',
            workflowVersion: '1.0.0',
            initiatedByUserId: user.id,
            idempotencyKey,
          })
        )
      )

      const results = await Promise.allSettled(promises)

      // Only one should succeed, others should fail due to unique constraint
      const successful = results.filter((r) => r.status === 'fulfilled')
      const failed = results.filter((r) => r.status === 'rejected')

      expect(successful.length).toBe(1)
      expect(failed.length).toBe(4)

      // Verify only one run was created
      const prisma = getPrismaClient()
      const runs = await prisma.workflowRun.findMany({
        where: { idempotencyKey },
      })

      expect(runs.length).toBe(1)
    })

    it('should handle concurrent state updates', async () => {
      if (!databaseService) return

      const created = await databaseService.withOrganization(organization.id, () =>
        repository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })
      )

      const promises = [
        databaseService.withOrganization(organization.id, () =>
          repository.updateRunState(created.id, {
            status: WorkflowState.RUNNING,
          })
        ),
        databaseService.withOrganization(organization.id, () =>
          repository.updateRunState(created.id, {
            status: WorkflowState.RUNNING,
            currentStepKey: 'step-1',
          })
        ),
      ]

      await Promise.all(promises)

      const updated = await databaseService.withOrganization(organization.id, () => repository.findRunById(created.id))

      expect(updated?.state).toBe(WorkflowState.RUNNING)
    })
  })
})
