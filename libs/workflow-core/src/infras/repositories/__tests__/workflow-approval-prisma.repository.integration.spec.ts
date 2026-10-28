import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  createTestProject,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'
import { randomUUID } from 'crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ApprovalStatus } from '../../../domain/entities/workflow-approval.entity'
import { WorkflowApprovalPrismaRepository } from '../workflow-approval-prisma.repository'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for WorkflowApprovalPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('WorkflowApprovalPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowApprovalPrismaRepository
  let workflowRepository: WorkflowPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowApprovalPrismaRepository(databaseService as unknown as DatabaseService)
      workflowRepository = new WorkflowPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.workflowApproval.deleteMany()
    await prisma.workflowRun.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('save', () => {
    it('should create new approval', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const approval = {
          id: randomUUID(),
          workflowRunId: workflowRun.id,
          status: ApprovalStatus.PENDING,
          planArtifactId: randomUUID(),
          planArtifactHash: 'hash-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await repository.save(approval)

        const result = await repository.findById(approval.id)
        expect(result).toMatchObject({
          id: approval.id,
          workflowRunId: workflowRun.id,
          status: ApprovalStatus.PENDING,
        })
      })
    })

    it('should update existing approval', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const approval = {
          id: randomUUID(),
          workflowRunId: workflowRun.id,
          status: ApprovalStatus.PENDING,
          planArtifactId: randomUUID(),
          planArtifactHash: 'hash-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await repository.save(approval)

        // Update approval
        const updatedApproval = {
          ...approval,
          status: ApprovalStatus.APPROVED,
          decidedByUserId: user.id,
          decidedAt: new Date(),
          updatedAt: new Date(),
        }

        await repository.save(updatedApproval)

        const result = await repository.findById(approval.id)
        expect(result?.status).toBe(ApprovalStatus.APPROVED)
        expect(result?.decidedByUserId).toBe(user.id)
      })
    })
  })

  describe('findByRunId', () => {
    it('should return approval for workflow run', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const approval = {
          id: randomUUID(),
          workflowRunId: workflowRun.id,
          status: ApprovalStatus.PENDING,
          planArtifactId: randomUUID(),
          planArtifactHash: 'hash-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await repository.save(approval)

        const result = await repository.findByRunId(workflowRun.id)
        expect(result?.workflowRunId).toBe(workflowRun.id)
      })
    })
  })

  describe('findPendingByRunId', () => {
    it('should return only pending non-invalidated approval', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const approval = {
          id: randomUUID(),
          workflowRunId: workflowRun.id,
          status: ApprovalStatus.PENDING,
          planArtifactId: randomUUID(),
          planArtifactHash: 'hash-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await repository.save(approval)

        const result = await repository.findPendingByRunId(workflowRun.id)
        expect(result?.status).toBe(ApprovalStatus.PENDING)
      })
    })

    it('should return null for invalidated approval', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const approval = {
          id: randomUUID(),
          workflowRunId: workflowRun.id,
          status: ApprovalStatus.PENDING,
          planArtifactId: randomUUID(),
          planArtifactHash: 'hash-1',
          invalidatedAt: new Date(),
          invalidationReason: 'Plan changed',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await repository.save(approval)

        const result = await repository.findPendingByRunId(workflowRun.id)
        expect(result).toBeNull()
      })
    })
  })
})
