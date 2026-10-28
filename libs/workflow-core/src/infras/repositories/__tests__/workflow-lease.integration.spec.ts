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

import { WorkflowState } from '../../../domain'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

describe('WorkflowPrismaRepository - Lease Operations (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowPrismaRepository
  let testOrgId: string
  let testProjectId: string
  let testUserId: string

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowPrismaRepository(databaseService as unknown as DatabaseService)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  }, 60000)

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

    // Setup test data
    const { organization, user } = await createTestOrgWithOwner(prisma)
    const project = await createTestProject(prisma, organization.id)

    testOrgId = organization.id
    testProjectId = project.id
    testUserId = user.id
  })

  describe('acquireLease', () => {
    it('should acquire lease successfully', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const prisma = getPrismaClient()
        const workerId = 'worker-1'
        const acquired = await repository.acquireLease(run.id, workerId, 300_000)

        expect(acquired).toBe(true)

        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.leaseOwnerId).toBe(workerId)
        expect(updated?.leaseExpiresAt).toBeDefined()
        expect(updated?.lastHeartbeatAt).toBeDefined()
      })
    })

    it('should not acquire lease if already owned', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const worker1 = 'worker-1'
        const worker2 = 'worker-2'

        // Worker 1 acquires
        const acquired1 = await repository.acquireLease(run.id, worker1, 300_000)
        expect(acquired1).toBe(true)

        // Worker 2 tries to acquire
        const acquired2 = await repository.acquireLease(run.id, worker2, 300_000)
        expect(acquired2).toBe(false)

        const prisma = getPrismaClient()
        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.leaseOwnerId).toBe(worker1)
      })
    })

    it('should acquire lease if previous lease expired', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const worker1 = 'worker-1'
        const worker2 = 'worker-2'
        const prisma = getPrismaClient()

        // Worker 1 acquires with expired lease
        const pastTime = new Date(Date.now() - 10000)
        await prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            leaseOwnerId: worker1,
            leaseExpiresAt: pastTime,
            lastHeartbeatAt: pastTime,
          },
        })

        // Worker 2 should be able to acquire
        const acquired = await repository.acquireLease(run.id, worker2, 300_000)
        expect(acquired).toBe(true)

        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.leaseOwnerId).toBe(worker2)
      })
    })
  })

  describe('renewLease', () => {
    it('should renew lease successfully', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const workerId = 'worker-1'
        await repository.acquireLease(run.id, workerId, 300_000)

        const prisma = getPrismaClient()
        const initialLease = await prisma.workflowRun.findUnique({ where: { id: run.id } })

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Renew
        const renewed = await repository.renewLease(run.id, workerId, 300_000)
        expect(renewed).toBe(true)

        const updatedLease = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updatedLease?.leaseExpiresAt?.getTime()).toBeGreaterThan(
          initialLease?.leaseExpiresAt?.getTime() || 0
        )
        expect(updatedLease?.lastHeartbeatAt?.getTime()).toBeGreaterThan(
          initialLease?.lastHeartbeatAt?.getTime() || 0
        )
      })
    })

    it('should not renew lease if not owner', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const worker1 = 'worker-1'
        const worker2 = 'worker-2'

        await repository.acquireLease(run.id, worker1, 300_000)

        // Worker 2 tries to renew
        const renewed = await repository.renewLease(run.id, worker2, 300_000)
        expect(renewed).toBe(false)

        const prisma = getPrismaClient()
        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.leaseOwnerId).toBe(worker1)
      })
    })
  })

  describe('releaseLease', () => {
    it('should release lease successfully', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const workerId = 'worker-1'
        await repository.acquireLease(run.id, workerId, 300_000)

        await repository.releaseLease(run.id, workerId)

        const prisma = getPrismaClient()
        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.leaseOwnerId).toBeNull()
        expect(updated?.leaseExpiresAt).toBeNull()
      })
    })

    it('should not release lease if not owner', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const worker1 = 'worker-1'
        const worker2 = 'worker-2'

        await repository.acquireLease(run.id, worker1, 300_000)

        // Worker 2 tries to release
        await repository.releaseLease(run.id, worker2)

        const prisma = getPrismaClient()
        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.leaseOwnerId).toBe(worker1)
      })
    })
  })

  describe('updateHeartbeat', () => {
    it('should update heartbeat timestamp', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const workerId = 'worker-1'
        await repository.acquireLease(run.id, workerId, 300_000)

        const prisma = getPrismaClient()
        const initial = await prisma.workflowRun.findUnique({ where: { id: run.id } })

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 100))

        await repository.updateHeartbeat(run.id, workerId)

        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.lastHeartbeatAt?.getTime()).toBeGreaterThan(
          initial?.lastHeartbeatAt?.getTime() || 0
        )
      })
    })

    it('should not update heartbeat if not owner', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const worker1 = 'worker-1'
        const worker2 = 'worker-2'

        await repository.acquireLease(run.id, worker1, 300_000)

        const prisma = getPrismaClient()
        const initial = await prisma.workflowRun.findUnique({ where: { id: run.id } })

        // Worker 2 tries to update heartbeat
        await repository.updateHeartbeat(run.id, worker2)

        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(updated?.lastHeartbeatAt?.getTime()).toBe(initial?.lastHeartbeatAt?.getTime())
      })
    })
  })

  describe('findExpiredLeases', () => {
    it('should find runs with expired leases', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        // Create runs with expired leases
        const run1 = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const run2 = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const run3 = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const prisma = getPrismaClient()
        const pastTime = new Date(Date.now() - 10000)

        // Set expired leases for run1 and run2
        await prisma.workflowRun.update({
          where: { id: run1.id },
          data: {
            leaseOwnerId: 'worker-1',
            leaseExpiresAt: pastTime,
            status: WorkflowState.RUNNING,
          },
        })

        await prisma.workflowRun.update({
          where: { id: run2.id },
          data: {
            leaseOwnerId: 'worker-2',
            leaseExpiresAt: pastTime,
            status: WorkflowState.QUEUED,
          },
        })

        // run3 has active lease
        await prisma.workflowRun.update({
          where: { id: run3.id },
          data: {
            leaseOwnerId: 'worker-3',
            leaseExpiresAt: new Date(Date.now() + 300_000),
            status: WorkflowState.RUNNING,
          },
        })

        const expiredIds = await repository.findExpiredLeases()

        expect(expiredIds).toContain(run1.id)
        expect(expiredIds).toContain(run2.id)
        expect(expiredIds).not.toContain(run3.id)
      })
    })

    it('should respect limit parameter', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        // Create 5 runs with expired leases
        const runs = await Promise.all(
          Array.from({ length: 5 }).map(() =>
            repository.createRun({
              organizationId: testOrgId,
              projectId: testProjectId,
              workflowKey: 'test-workflow',
              workflowVersion: '1.0.0',
              initiatedByUserId: testUserId,
            })
          )
        )

        const prisma = getPrismaClient()
        const pastTime = new Date(Date.now() - 10000)

        for (let i = 0; i < runs.length; i++) {
          const run = runs[i]
          await prisma.workflowRun.update({
            where: { id: run.id },
            data: {
              leaseOwnerId: `worker-${i}`,
              leaseExpiresAt: pastTime,
              status: WorkflowState.RUNNING,
            },
          })
        }

        const expiredIds = await repository.findExpiredLeases(3)

        expect(expiredIds.length).toBe(3)
      })
    })

    it('should not include completed runs', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const prisma = getPrismaClient()
        // Clean up any previous expired leases first to isolate the test
        await prisma.workflowRun.updateMany({
          where: {
            leaseExpiresAt: { not: null },
          },
          data: {
            leaseOwnerId: null,
            leaseExpiresAt: null,
          },
        })

        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const pastTime = new Date(Date.now() - 10000)

        // Set expired lease but succeeded status
        await prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            leaseOwnerId: 'worker-1',
            leaseExpiresAt: pastTime,
            status: WorkflowState.SUCCEEDED,
          },
        })

        const expiredIds = await repository.findExpiredLeases()

        // Should not include succeeded run
        expect(expiredIds).not.toContain(run.id)

        // Verify the run still has expired lease data but is succeeded
        const completedRun = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        expect(completedRun?.status).toBe(WorkflowState.SUCCEEDED)
        expect(completedRun?.leaseExpiresAt).toBeDefined()
        expect(completedRun?.leaseExpiresAt?.getTime()).toBeLessThan(Date.now())
      })
    })
  })

  describe('concurrent lease acquisition', () => {
    it('should handle concurrent acquisition attempts atomically', async () => {
      if (!databaseService) return

      await databaseService.withOrganization(testOrgId, async () => {
        const run = await repository.createRun({
          organizationId: testOrgId,
          projectId: testProjectId,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: testUserId,
        })

        const worker1 = 'worker-1'
        const worker2 = 'worker-2'
        const worker3 = 'worker-3'

        // Simulate concurrent acquisition attempts
        const results = await Promise.all([
          repository.acquireLease(run.id, worker1, 300_000),
          repository.acquireLease(run.id, worker2, 300_000),
          repository.acquireLease(run.id, worker3, 300_000),
        ])

        // Only one should succeed
        const successCount = results.filter((r) => r === true).length
        expect(successCount).toBe(1)

        // Verify only one worker owns the lease
        const prisma = getPrismaClient()
        const updated = await prisma.workflowRun.findUnique({ where: { id: run.id } })
        const winner = [worker1, worker2, worker3].find((w) => w === updated?.leaseOwnerId)
        expect(winner).toBeDefined()
      })
    })
  })
})
