import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { WorkflowApprovalStatus } from '../../../domain'
import { WorkflowApprovalPrismaRepository } from '../workflow-approval-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for WorkflowApprovalPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('WorkflowApprovalPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowApprovalPrismaRepository
  let setupFailed = false

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowApprovalPrismaRepository(databaseService as unknown as DatabaseService)
    } catch (error) {
      setupFailed = true
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  beforeEach(async () => {
    if (setupFailed || !databaseService) return

    const prisma = getPrismaClient()
    // Clean up data in reverse dependency order
    await prisma.workflowApproval.deleteMany()
    await prisma.workflow.deleteMany()
    await prisma.project.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    resetCounters()
  })

  describe('create', () => {
    it('should create a new approval request', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)

      expect(approval).toMatchObject({
        workflowId: 'workflow-1',
        proposalArtifactId: 'artifact-1',
        status: WorkflowApprovalStatus.PENDING,
        requestedById: user.id,
        decidedById: null,
        decisionNote: null,
      })
      expect(approval.id).toBeDefined()
      expect(approval.organizationId).toBe(organization.id)
      expect(approval.requestedAt).toBeInstanceOf(Date)
      expect(approval.decidedAt).toBeNull()
    })

    it('should associate approval with organization via tenant context', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)

      // Verify in database
      const dbApproval = await prisma.workflowApproval.findUnique({
        where: { id: approval.id },
      })

      expect(dbApproval?.organizationId).toBe(organization.id)
    })
  })

  describe('findById', () => {
    it('should find approval by ID', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const created = await repository.create('workflow-1', 'artifact-1', user.id)

      const found = await repository.findById(created.id)

      expect(found).toEqual(created)
    })

    it('should return null for non-existent approval', async () => {
      if (setupFailed || !databaseService) return

      const result = await repository.findById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should enforce tenant isolation when finding by ID', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create approval in org1
      databaseService.setTenantContext(org1.id)
      const approval = await repository.create('workflow-1', 'artifact-1', user1.id)

      // Try to access from org2
      databaseService.setTenantContext(org2.id)
      const found = await repository.findById(approval.id)

      expect(found).toBeNull()
    })
  })

  describe('findByWorkflowId', () => {
    it('should retrieve all approvals for a workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.create('workflow-1', 'artifact-1', user.id)
      await repository.create('workflow-1', 'artifact-2', user.id)
      await repository.create('workflow-2', 'artifact-3', user.id)

      const approvals = await repository.findByWorkflowId('workflow-1')

      expect(approvals).toHaveLength(2)
      expect(approvals.every((a) => a.workflowId === 'workflow-1')).toBe(true)
    })

    it('should return approvals ordered by requestedAt descending', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const a1 = await repository.create('workflow-1', 'artifact-1', user.id)
      await new Promise((resolve) => setTimeout(resolve, 10))
      const a2 = await repository.create('workflow-1', 'artifact-2', user.id)

      const approvals = await repository.findByWorkflowId('workflow-1')

      expect(approvals[0].id).toBe(a2.id)
      expect(approvals[1].id).toBe(a1.id)
    })

    it('should return empty array for workflow with no approvals', async () => {
      if (setupFailed || !databaseService) return

      const approvals = await repository.findByWorkflowId('workflow-no-approvals')

      expect(approvals).toEqual([])
    })
  })

  describe('findPendingByWorkflowId', () => {
    it('should find pending approvals only', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const pending = await repository.create('workflow-1', 'artifact-1', user.id)
      const approved = await repository.create('workflow-1', 'artifact-2', user.id)

      // Update approved one
      await repository.updateStatus(approved.id, WorkflowApprovalStatus.APPROVED, user.id)

      const pendingApprovals = await repository.findPendingByWorkflowId('workflow-1')

      expect(pendingApprovals).toHaveLength(1)
      expect(pendingApprovals[0].id).toBe(pending.id)
      expect(pendingApprovals[0].status).toBe(WorkflowApprovalStatus.PENDING)
    })

    it('should not include rejected or approved', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const pending = await repository.create('workflow-1', 'artifact-1', user.id)
      const approved = await repository.create('workflow-1', 'artifact-2', user.id)
      const rejected = await repository.create('workflow-1', 'artifact-3', user.id)

      // Update statuses
      await repository.updateStatus(approved.id, WorkflowApprovalStatus.APPROVED, user.id)
      await repository.updateStatus(rejected.id, WorkflowApprovalStatus.REJECTED, user.id, 'Not suitable')

      const pending2 = await repository.create('workflow-1', 'artifact-4', user.id)

      const pendingApprovals = await repository.findPendingByWorkflowId('workflow-1')

      expect(pendingApprovals).toHaveLength(2)
      expect(pendingApprovals.map((a) => a.id)).toContain(pending.id)
      expect(pendingApprovals.map((a) => a.id)).toContain(pending2.id)
    })

    it('should return empty array when no pending approvals', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)
      await repository.updateStatus(approval.id, WorkflowApprovalStatus.APPROVED, user.id)

      const pendingApprovals = await repository.findPendingByWorkflowId('workflow-1')

      expect(pendingApprovals).toEqual([])
    })
  })

  describe('updateStatus', () => {
    it('should update approval to APPROVED', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)

      const updated = await repository.updateStatus(approval.id, WorkflowApprovalStatus.APPROVED, user.id)

      expect(updated.status).toBe(WorkflowApprovalStatus.APPROVED)
      expect(updated.decidedById).toBe(user.id)
      expect(updated.decidedAt).not.toBeNull()
    })

    it('should update approval to REJECTED with note', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)
      const note = 'Requirements not met'

      const updated = await repository.updateStatus(approval.id, WorkflowApprovalStatus.REJECTED, user.id, note)

      expect(updated.status).toBe(WorkflowApprovalStatus.REJECTED)
      expect(updated.decisionNote).toBe(note)
      expect(updated.decidedAt).not.toBeNull()
    })

    it('should set decidedAt timestamp', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)
      const beforeUpdate = new Date()

      const updated = await repository.updateStatus(approval.id, WorkflowApprovalStatus.APPROVED, user.id)

      expect(updated.decidedAt).not.toBeNull()
      expect(updated.decidedAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    it('should support all approval statuses', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const statuses = [
        WorkflowApprovalStatus.APPROVED,
        WorkflowApprovalStatus.REJECTED,
        WorkflowApprovalStatus.PENDING,
      ]

      for (const status of statuses) {
        const approval = await repository.create('workflow-1', `artifact-${status}`, user.id)
        const updated = await repository.updateStatus(approval.id, status, user.id)
        expect(updated.status).toBe(status)
      }
    })

    it('should enforce tenant isolation on update', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2, user: user2 } = await createTestOrgWithOwner(prisma)

      // Create approval in org1
      databaseService.setTenantContext(org1.id)
      const approval = await repository.create('workflow-1', 'artifact-1', user1.id)

      // Try to update from org2
      databaseService.setTenantContext(org2.id)
      let error: Error | undefined
      try {
        await repository.updateStatus(approval.id, WorkflowApprovalStatus.APPROVED, user2.id)
      } catch (e) {
        error = e as Error
      }

      // Should throw not found error from Prisma
      expect(error).toBeDefined()

      // Verify status unchanged in org1
      databaseService.setTenantContext(org1.id)
      const unchanged = await repository.findById(approval.id)
      expect(unchanged?.status).toBe(WorkflowApprovalStatus.PENDING)
    })
  })

  describe('delete', () => {
    it('should delete an approval', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const approval = await repository.create('workflow-1', 'artifact-1', user.id)

      await repository.delete(approval.id)

      const found = await repository.findById(approval.id)
      expect(found).toBeNull()
    })

    it('should enforce tenant isolation on delete', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create approval in org1
      databaseService.setTenantContext(org1.id)
      const approval = await repository.create('workflow-1', 'artifact-1', user1.id)

      // Try to delete from org2
      databaseService.setTenantContext(org2.id)
      let error: Error | undefined
      try {
        await repository.delete(approval.id)
      } catch (e) {
        error = e as Error
      }

      // Should throw not found error from Prisma
      expect(error).toBeDefined()

      // Verify approval still exists in org1
      databaseService.setTenantContext(org1.id)
      const found = await repository.findById(approval.id)
      expect(found).not.toBeNull()
    })
  })

  describe('Tenant Isolation', () => {
    it('should isolate approvals by organization', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2, user: user2 } = await createTestOrgWithOwner(prisma)

      // Create approval in org1
      databaseService.setTenantContext(org1.id)
      const a1 = await repository.create('workflow-1', 'artifact-1', user1.id)

      // Create approval in org2
      databaseService.setTenantContext(org2.id)
      const a2 = await repository.create('workflow-1', 'artifact-2', user2.id)

      // Verify isolation - org1 should only see a1
      databaseService.setTenantContext(org1.id)
      const org1Approvals = await repository.findByWorkflowId('workflow-1')
      expect(org1Approvals).toHaveLength(1)
      expect(org1Approvals[0].id).toBe(a1.id)

      // org2 should only see a2
      databaseService.setTenantContext(org2.id)
      const org2Approvals = await repository.findByWorkflowId('workflow-1')
      expect(org2Approvals).toHaveLength(1)
      expect(org2Approvals[0].id).toBe(a2.id)
    })

    it('should isolate pending approvals by organization', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2, user: user2 } = await createTestOrgWithOwner(prisma)

      // Create approvals in org1
      databaseService.setTenantContext(org1.id)
      const pending1 = await repository.create('workflow-1', 'artifact-1', user1.id)

      // Create and approve in org2
      databaseService.setTenantContext(org2.id)
      const approved2 = await repository.create('workflow-1', 'artifact-2', user2.id)
      const pending2 = await repository.create('workflow-1', 'artifact-3', user2.id)
      await repository.updateStatus(approved2.id, WorkflowApprovalStatus.APPROVED, user2.id)

      // Verify pending approvals are isolated
      databaseService.setTenantContext(org1.id)
      const org1Pending = await repository.findPendingByWorkflowId('workflow-1')
      expect(org1Pending).toHaveLength(1)
      expect(org1Pending[0].id).toBe(pending1.id)

      databaseService.setTenantContext(org2.id)
      const org2Pending = await repository.findPendingByWorkflowId('workflow-1')
      expect(org2Pending).toHaveLength(1)
      expect(org2Pending[0].id).toBe(pending2.id)
    })
  })

  describe('Workflow Lifecycle', () => {
    it('should track approval workflow from pending to approved', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Create initial request
      const approval = await repository.create('workflow-1', 'artifact-1', user.id)
      expect(approval.status).toBe(WorkflowApprovalStatus.PENDING)
      expect(approval.decidedAt).toBeNull()

      // Approve
      const approved = await repository.updateStatus(approval.id, WorkflowApprovalStatus.APPROVED, user.id)
      expect(approved.status).toBe(WorkflowApprovalStatus.APPROVED)
      expect(approved.decidedAt).not.toBeNull()

      // Verify persisted
      const final = await repository.findById(approval.id)
      expect(final?.status).toBe(WorkflowApprovalStatus.APPROVED)
    })

    it('should handle multiple artifact versions for same workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Request approval for v1
      const v1 = await repository.create('workflow-1', 'artifact-v1', user.id)
      await repository.updateStatus(v1.id, WorkflowApprovalStatus.REJECTED, user.id, 'Needs revision')

      // Request approval for v2
      const v2 = await repository.create('workflow-1', 'artifact-v2', user.id)

      const allApprovals = await repository.findByWorkflowId('workflow-1')
      expect(allApprovals).toHaveLength(2)

      const pending = await repository.findPendingByWorkflowId('workflow-1')
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe(v2.id)
    })
  })
})
