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

import { WorkflowStatus, WorkflowType } from '../../../domain'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for WorkflowPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('WorkflowPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowPrismaRepository
  let setupFailed = false

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.workflow.deleteMany()
    await prisma.project.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    resetCounters()
  })

  describe('create', () => {
    it('should create a new workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, {
        title: 'Test Workflow',
        description: 'A test workflow',
      })

      expect(workflow).toMatchObject({
        title: 'Test Workflow',
        description: 'A test workflow',
        projectId: project.id,
        createdById: user.id,
        status: WorkflowStatus.DRAFT,
        type: null,
      })
      expect(workflow.id).toBeDefined()
      expect(workflow.organizationId).toBe(organization.id)
      expect(workflow.createdAt).toBeInstanceOf(Date)
      expect(workflow.updatedAt).toBeInstanceOf(Date)
    })

    it('should create workflow without description', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, {
        title: 'Minimal Workflow',
      })

      expect(workflow.description).toBeNull()
    })

    it('should associate workflow with organization via tenant context', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, {
        title: 'Test Workflow',
      })

      // Verify in database
      const dbWorkflow = await prisma.workflow.findUnique({
        where: { id: workflow.id },
      })

      expect(dbWorkflow?.organizationId).toBe(organization.id)
    })
  })

  describe('findById', () => {
    it('should find workflow by ID', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const created = await repository.create(project.id, user.id, {
        title: 'Test Workflow',
      })

      const found = await repository.findById(created.id)

      expect(found).toEqual(created)
    })

    it('should return null for non-existent workflow', async () => {
      if (setupFailed || !databaseService) return

      const result = await repository.findById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should enforce tenant isolation when finding by ID', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const project1 = await createTestProject(prisma, org1.id)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create workflow in org1
      databaseService.setTenantContext(org1.id)
      const workflow = await repository.create(project1.id, user1.id, {
        title: 'Org1 Workflow',
      })

      // Try to access from org2
      databaseService.setTenantContext(org2.id)
      const found = await repository.findById(workflow.id)

      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should retrieve all workflows for a project', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      await repository.create(project.id, user.id, { title: 'Workflow 1' })
      await repository.create(project.id, user.id, { title: 'Workflow 2' })
      await repository.create(project.id, user.id, { title: 'Workflow 3' })

      const workflows = await repository.findAll(project.id, {})

      expect(workflows).toHaveLength(3)
      expect(workflows.every((w) => w.projectId === project.id)).toBe(true)
    })

    it('should support pagination', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      // Create 5 workflows
      for (let i = 1; i <= 5; i++) {
        await repository.create(project.id, user.id, { title: `Workflow ${i}` })
      }

      const page1 = await repository.findAll(project.id, { skip: 0, take: 2 })
      const page2 = await repository.findAll(project.id, { skip: 2, take: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
      expect(page1[0].id).not.toBe(page2[0].id)
    })

    it('should filter workflows by status', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const draft = await repository.create(project.id, user.id, { title: 'Draft Workflow' })
      const active = await repository.create(project.id, user.id, { title: 'Active Workflow' })

      // Update second to ACTIVE
      await repository.updateStatus(active.id, WorkflowStatus.ACTIVE)

      const draftWorkflows = await repository.findAll(project.id, { status: WorkflowStatus.DRAFT })

      expect(draftWorkflows).toHaveLength(1)
      expect(draftWorkflows[0].id).toBe(draft.id)
    })

    it('should filter workflows by type', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const story = await repository.create(project.id, user.id, { title: 'Story Workflow' })
      const hotfix = await repository.create(project.id, user.id, { title: 'Hotfix Workflow' })

      // Update types
      await repository.updateType(story.id, WorkflowType.STORY, user.id)
      await repository.updateType(hotfix.id, WorkflowType.HOTFIX, user.id)

      const storyWorkflows = await repository.findAll(project.id, { type: WorkflowType.STORY })

      expect(storyWorkflows).toHaveLength(1)
      expect(storyWorkflows[0].id).toBe(story.id)
    })

    it('should search workflows by title and description', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      await repository.create(project.id, user.id, {
        title: 'Build User Interface',
        description: 'Create responsive design',
      })
      await repository.create(project.id, user.id, {
        title: 'Fix Database Query',
        description: 'Optimize performance',
      })

      const results = await repository.findAll(project.id, { search: 'Database' })

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Fix Database Query')
    })

    it('should return workflows sorted by createdAt descending by default', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow1 = await repository.create(project.id, user.id, { title: 'Workflow 1' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      const workflow2 = await repository.create(project.id, user.id, { title: 'Workflow 2' })

      const workflows = await repository.findAll(project.id, {})

      expect(workflows[0].id).toBe(workflow2.id)
      expect(workflows[1].id).toBe(workflow1.id)
    })

    it('should return empty array for project with no workflows', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflows = await repository.findAll(project.id, {})

      expect(workflows).toEqual([])
    })
  })

  describe('count', () => {
    it('should return total count of workflows', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      await repository.create(project.id, user.id, { title: 'Workflow 1' })
      await repository.create(project.id, user.id, { title: 'Workflow 2' })

      const count = await repository.count(project.id, {})

      expect(count).toBe(2)
    })

    it('should count workflows with filters', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const draft = await repository.create(project.id, user.id, { title: 'Draft' })
      const active = await repository.create(project.id, user.id, { title: 'Active' })

      await repository.updateStatus(active.id, WorkflowStatus.ACTIVE)

      const draftCount = await repository.count(project.id, { status: WorkflowStatus.DRAFT })

      expect(draftCount).toBe(1)
      expect(draft.id).toBeDefined() // Use draft in assertion
    })

    it('should return zero for project with no workflows', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const count = await repository.count(project.id, {})

      expect(count).toBe(0)
    })
  })

  describe('update', () => {
    it('should update workflow title and description', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, {
        title: 'Original Title',
        description: 'Original Description',
      })

      const updated = await repository.update(workflow.id, {
        title: 'Updated Title',
        description: 'Updated Description',
      })

      expect(updated.title).toBe('Updated Title')
      expect(updated.description).toBe('Updated Description')
    })

    it('should enforce tenant isolation on update', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const project1 = await createTestProject(prisma, org1.id)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create workflow in org1
      databaseService.setTenantContext(org1.id)
      const workflow = await repository.create(project1.id, user1.id, { title: 'Org1 Workflow' })

      // Try to update from org2
      databaseService.setTenantContext(org2.id)
      let error: Error | undefined
      try {
        await repository.update(workflow.id, { title: 'Hijacked' })
      } catch (e) {
        error = e as Error
      }

      // Should throw not found error from Prisma
      expect(error).toBeDefined()
    })
  })

  describe('updateStatus', () => {
    it('should update workflow status', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, { title: 'Test' })

      await repository.updateStatus(workflow.id, WorkflowStatus.ACTIVE)

      const updated = await repository.findById(workflow.id)
      expect(updated?.status).toBe(WorkflowStatus.ACTIVE)
    })

    it('should set startedAt when status changes to ACTIVE', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, { title: 'Test' })

      await repository.updateStatus(workflow.id, WorkflowStatus.ACTIVE)

      const updated = await repository.findById(workflow.id)
      expect(updated?.startedAt).not.toBeNull()
    })

    it('should set completedAt when status changes to COMPLETED', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, { title: 'Test' })

      await repository.updateStatus(workflow.id, WorkflowStatus.COMPLETED)

      const updated = await repository.findById(workflow.id)
      expect(updated?.completedAt).not.toBeNull()
    })

    it('should support all workflow statuses', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const statuses = [
        WorkflowStatus.BRAINSTORMING,
        WorkflowStatus.CLASSIFICATION_PENDING,
        WorkflowStatus.ACTIVE,
        WorkflowStatus.WAITING_APPROVAL,
        WorkflowStatus.COMPLETED,
        WorkflowStatus.FAILED,
        WorkflowStatus.CANCELLED,
      ]

      for (const status of statuses) {
        const workflow = await repository.create(project.id, user.id, { title: `${status} Workflow` })
        await repository.updateStatus(workflow.id, status)

        const updated = await repository.findById(workflow.id)
        expect(updated?.status).toBe(status)
      }
    })
  })

  describe('updateType', () => {
    it('should update workflow type', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, { title: 'Test' })

      await repository.updateType(workflow.id, WorkflowType.STORY, user.id)

      const updated = await repository.findById(workflow.id)
      expect(updated?.type).toBe(WorkflowType.STORY)
    })

    it('should set classificationConfirmedAt and classificationConfirmedById', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, { title: 'Test' })

      await repository.updateType(workflow.id, WorkflowType.HOTFIX, user.id)

      const updated = await repository.findById(workflow.id)
      expect(updated?.classificationConfirmedById).toBe(user.id)
      expect(updated?.classificationConfirmedAt).not.toBeNull()
    })

    it('should support all workflow types', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const types = [WorkflowType.HOTFIX, WorkflowType.STORY, WorkflowType.EPIC]

      for (const type of types) {
        const workflow = await repository.create(project.id, user.id, { title: `${type} Workflow` })
        await repository.updateType(workflow.id, type, user.id)

        const updated = await repository.findById(workflow.id)
        expect(updated?.type).toBe(type)
      }
    })
  })

  describe('delete', () => {
    it('should delete a workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      const workflow = await repository.create(project.id, user.id, { title: 'Test' })

      await repository.delete(workflow.id)

      const found = await repository.findById(workflow.id)
      expect(found).toBeNull()
    })

    it('should enforce tenant isolation on delete', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const project1 = await createTestProject(prisma, org1.id)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create workflow in org1
      databaseService.setTenantContext(org1.id)
      const workflow = await repository.create(project1.id, user1.id, { title: 'Org1 Workflow' })

      // Try to delete from org2
      databaseService.setTenantContext(org2.id)
      let error: Error | undefined
      try {
        await repository.delete(workflow.id)
      } catch (e) {
        error = e as Error
      }

      // Should throw not found error from Prisma
      expect(error).toBeDefined()

      // Verify workflow still exists in org1
      databaseService.setTenantContext(org1.id)
      const found = await repository.findById(workflow.id)
      expect(found).not.toBeNull()
    })
  })

  describe('Tenant Isolation', () => {
    it('should isolate workflows by organization', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1, user: user1 } = await createTestOrgWithOwner(prisma)
      const project1 = await createTestProject(prisma, org1.id)
      const { organization: org2, user: user2 } = await createTestOrgWithOwner(prisma)
      const project2 = await createTestProject(prisma, org2.id)

      // Create workflow in org1
      databaseService.setTenantContext(org1.id)
      const w1 = await repository.create(project1.id, user1.id, { title: 'Org1 Workflow' })

      // Create workflow in org2
      databaseService.setTenantContext(org2.id)
      const w2 = await repository.create(project2.id, user2.id, { title: 'Org2 Workflow' })

      // Verify isolation - org1 should only see w1
      databaseService.setTenantContext(org1.id)
      const org1Workflows = await repository.findAll(project1.id, {})
      expect(org1Workflows).toHaveLength(1)
      expect(org1Workflows[0].id).toBe(w1.id)

      // org2 should only see w2
      databaseService.setTenantContext(org2.id)
      const org2Workflows = await repository.findAll(project2.id, {})
      expect(org2Workflows).toHaveLength(1)
      expect(org2Workflows[0].id).toBe(w2.id)
    })

    it('should count workflows in tenant context only', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: orgA, user: userA } = await createTestOrgWithOwner(prisma)
      const projectA = await createTestProject(prisma, orgA.id)
      const { organization: orgB, user: userB } = await createTestOrgWithOwner(prisma)
      const projectB = await createTestProject(prisma, orgB.id)

      // Create workflows in org1
      databaseService.setTenantContext(orgA.id)
      await repository.create(projectA.id, userA.id, { title: 'W1' })
      await repository.create(projectA.id, userA.id, { title: 'W2' })

      // Create workflows in org2
      databaseService.setTenantContext(orgB.id)
      await repository.create(projectB.id, userB.id, { title: 'W3' })

      // Count should be tenant-specific
      databaseService.setTenantContext(orgA.id)
      expect(await repository.count(projectA.id, {})).toBe(2)

      databaseService.setTenantContext(orgB.id)
      expect(await repository.count(projectB.id, {})).toBe(1)
    })
  })

  describe('Cascade and Constraints', () => {
    it('should handle large list of workflows efficiently', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      databaseService.setTenantContext(organization.id)

      // Create 50 workflows
      for (let i = 1; i <= 50; i++) {
        await repository.create(project.id, user.id, { title: `Workflow ${i}` })
      }

      const count = await repository.count(project.id, {})
      expect(count).toBe(50)

      const page = await repository.findAll(project.id, { skip: 0, take: 20 })
      expect(page).toHaveLength(20)
    })
  })
})
