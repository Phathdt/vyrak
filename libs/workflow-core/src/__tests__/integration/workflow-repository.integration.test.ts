import type { DatabaseService } from '@vyrak/database'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanupTestData, IntegrationTestSetup, testData } from './test-utils'

import { WorkflowState, type IWorkflowRepository } from '../../domain'
import { WORKFLOW_REPOSITORY } from '../../infras'

describe('WorkflowRepository Integration Tests', () => {
  let db: DatabaseService
  let repository: IWorkflowRepository
  let orgId: string
  let projectId: string
  let userId: string

  beforeAll(async () => {
    await IntegrationTestSetup.init()
    db = IntegrationTestSetup.db
    repository = IntegrationTestSetup.get<IWorkflowRepository>(WORKFLOW_REPOSITORY)
  })

  afterAll(async () => {
    await IntegrationTestSetup.cleanup()
  })

  beforeEach(async () => {
    orgId = testData.orgId()
    projectId = testData.projectId()
    const userEmail = `test-user-${Math.random().toString(36).slice(2)}@test.com`

    // Ensure test user exists and capture the ID
    await db.withSystemAccess(async () => {
      const user = await db.client.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
          email: userEmail,
          name: userEmail.split('@')[0],
        },
      })
      userId = user.id
    })

    // Ensure org and project exist
    await db.withSystemAccess(async () => {
      await db.client.organization.upsert({
        where: { id: orgId },
        update: {},
        create: {
          id: orgId,
          name: `Test Org ${orgId}`,
          slug: orgId,
        },
      })

      await db.client.project.upsert({
        where: {
          organizationId_slug: {
            organizationId: orgId,
            slug: projectId,
          },
        },
        update: {},
        create: {
          id: projectId,
          organizationId: orgId,
          name: `Test Project`,
          slug: projectId,
        },
      })
    })
  })

  afterEach(async () => {
    await cleanupTestData(db, orgId)
  })

  describe('createRun', () => {
    it('should create a workflow run with correct initial state', async () => {
      const run = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          input: testData.workflowInput(),
        })
      )

      expect(run).toBeDefined()
      expect(run.id).toBeDefined()
      expect(run.organizationId).toBe(orgId)
      expect(run.projectId).toBe(projectId)
      expect(run.workflowKey).toBe('workflow-1')
      expect(run.workflowVersion).toBe('1.0.0')
      expect(run.state).toBe(WorkflowState.QUEUED)
      expect(run.initiatedByUserId).toBe(userId)
      expect(run.createdAt).toBeInstanceOf(Date)
      expect(run.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate idempotency key if not provided', async () => {
      const run = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      expect(run.idempotencyKey).toBeDefined()
      expect(typeof run.idempotencyKey).toBe('string')
      expect(run.idempotencyKey?.length).toBeGreaterThan(0)
    })

    it('should use provided idempotency key', async () => {
      const idempotencyKey = testData.orgId() // Use UUID for valid idempotency key
      const run = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          idempotencyKey,
        })
      )

      expect(run.idempotencyKey).toBe(idempotencyKey)
    })

    it('should throw error for duplicate idempotency key', async () => {
      const idempotencyKey = testData.orgId() // Use UUID for valid idempotency key

      await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          idempotencyKey,
        })
      )

      // Attempt to create with same idempotency key
      await expect(
        db.withOrganization(orgId, () =>
          repository.createRun({
            organizationId: orgId,
            projectId,
            workflowKey: 'workflow-2',
            workflowVersion: '2.0.0',
            initiatedByUserId: userId,
            idempotencyKey,
          })
        )
      ).rejects.toThrow()
    })

    it('should allow same idempotency key in different organizations', async () => {
      const orgId2 = testData.orgId()
      const projectId2 = testData.projectId()
      const idempotencyKey = testData.orgId() // Use UUID for valid idempotency key

      // Setup second org and project
      await db.withSystemAccess(async () => {
        await db.client.organization.create({
          data: {
            id: orgId2,
            name: `Test Org ${orgId2}`,
            slug: orgId2,
          },
        })

        await db.client.project.create({
          data: {
            id: projectId2,
            organizationId: orgId2,
            name: 'Test Project 2',
            slug: projectId2,
          },
        })
      })

      const run1 = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          idempotencyKey,
        })
      )

      const run2 = await db.withOrganization(orgId2, () =>
        repository.createRun({
          organizationId: orgId2,
          projectId: projectId2,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          idempotencyKey,
        })
      )

      expect(run1.id).not.toBe(run2.id)
      expect(run1.organizationId).toBe(orgId)
      expect(run2.organizationId).toBe(orgId2)

      // Cleanup second org
      await db.withSystemAccess(async () => {
        await db.client.workflowRun.deleteMany({ where: { organizationId: orgId2 } })
        await db.client.project.deleteMany({ where: { organizationId: orgId2 } })
        await db.client.organization.delete({ where: { id: orgId2 } })
      })
    })
  })

  describe('findRunById', () => {
    it('should find a workflow run by ID', async () => {
      const created = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const found = await db.withOrganization(orgId, () => repository.findRunById(created.id))

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.organizationId).toBe(orgId)
      expect(found?.workflowKey).toBe('workflow-1')
    })

    it('should return null for non-existent run', async () => {
      const found = await db.withOrganization(orgId, () => repository.findRunById('non-existent-id'))

      expect(found).toBeNull()
    })

    it('should enforce tenant isolation - cannot access other org run', async () => {
      const orgId2 = testData.orgId()

      // Setup second org
      await db.withSystemAccess(async () => {
        await db.client.organization.create({
          data: {
            id: orgId2,
            name: `Test Org ${orgId2}`,
            slug: orgId2,
          },
        })
      })

      const run = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      // Try to access from different org - should be blocked by tenant filter
      const found = await db.withOrganization(orgId2, () => repository.findRunById(run.id))

      expect(found).toBeNull()

      // Cleanup
      await db.withSystemAccess(async () => {
        await db.client.organization.delete({ where: { id: orgId2 } })
      })
    })
  })

  describe('findRunByIdempotencyKey', () => {
    it('should find run by idempotency key', async () => {
      const idempotencyKey = testData.orgId() // Use UUID for valid idempotency key

      const created = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          idempotencyKey,
        })
      )

      const found = await db.withOrganization(orgId, () => repository.findRunByIdempotencyKey(orgId, idempotencyKey))

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.idempotencyKey).toBe(idempotencyKey)
    })

    it('should return null for non-existent idempotency key', async () => {
      const found = await db.withOrganization(orgId, () => repository.findRunByIdempotencyKey(orgId, testData.orgId()))

      expect(found).toBeNull()
    })

    it('should be scoped to organization', async () => {
      const idempotencyKey = testData.orgId() // Use UUID for valid idempotency key

      await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          idempotencyKey,
        })
      )

      const orgId2 = testData.orgId()
      const found = await db.withOrganization(orgId2, () => repository.findRunByIdempotencyKey(orgId2, idempotencyKey))

      expect(found).toBeNull()
    })
  })

  describe('updateRunState', () => {
    it('should update workflow run state', async () => {
      const created = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const startTime = new Date()
      await db.withOrganization(orgId, () =>
        repository.updateRunState(created.id, {
          status: WorkflowState.RUNNING,
          startedAt: startTime,
        })
      )

      const updated = await db.withOrganization(orgId, () => repository.findRunById(created.id))

      expect(updated?.state).toBe(WorkflowState.RUNNING)
      expect(updated?.startedAt).toEqual(startTime)
    })

    it('should update multiple state fields', async () => {
      const created = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const now = new Date()
      await db.withOrganization(orgId, () =>
        repository.updateRunState(created.id, {
          status: WorkflowState.SUCCEEDED,
          currentStepKey: 'step-5',
          startedAt: new Date(now.getTime() - 60000),
          completedAt: now,
        })
      )

      const updated = await db.withOrganization(orgId, () => repository.findRunById(created.id))

      expect(updated?.state).toBe(WorkflowState.SUCCEEDED)
      expect(updated?.currentStepKey).toBe('step-5')
      expect(updated?.completedAt).toEqual(now)
    })

    it('should throw error for non-existent run', async () => {
      await expect(
        db.withOrganization(orgId, () =>
          repository.updateRunState('non-existent-id', {
            status: WorkflowState.RUNNING,
          })
        )
      ).rejects.toThrow()
    })
  })

  describe('cancelRun', () => {
    it('should cancel a workflow run', async () => {
      const created = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      await db.withOrganization(orgId, () => repository.cancelRun(created.id))

      const cancelled = await db.withOrganization(orgId, () => repository.findRunById(created.id))

      expect(cancelled?.state).toBe(WorkflowState.CANCELLED)
    })

    it('should throw error for non-existent run', async () => {
      await expect(db.withOrganization(orgId, () => repository.cancelRun('non-existent-id'))).rejects.toThrow()
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent run creates safely', async () => {
      const idempotencyKey = testData.orgId() // Use UUID for valid idempotency key
      const promises = Array.from({ length: 5 }).map(() =>
        db.withOrganization(orgId, () =>
          repository.createRun({
            organizationId: orgId,
            projectId,
            workflowKey: 'workflow-1',
            workflowVersion: '1.0.0',
            initiatedByUserId: userId,
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
      const runs = await db.withSystemAccess(async () =>
        db.client.workflowRun.findMany({
          where: { idempotencyKey },
        })
      )

      expect(runs.length).toBe(1)
    })

    it('should handle concurrent state updates', async () => {
      const created = await db.withOrganization(orgId, () =>
        repository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const promises = [
        db.withOrganization(orgId, () =>
          repository.updateRunState(created.id, {
            status: WorkflowState.RUNNING,
          })
        ),
        db.withOrganization(orgId, () =>
          repository.updateRunState(created.id, {
            status: WorkflowState.RUNNING,
            currentStepKey: 'step-1',
          })
        ),
      ]

      await Promise.all(promises)

      const updated = await db.withOrganization(orgId, () => repository.findRunById(created.id))

      expect(updated?.state).toBe(WorkflowState.RUNNING)
    })
  })
})
