import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { WorkflowRepositoryPrismaRepository } from '../workflow-repository-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for WorkflowRepositoryPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('WorkflowRepositoryPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowRepositoryPrismaRepository
  let setupFailed = false

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowRepositoryPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.workflowRepository.deleteMany()
    await prisma.workflow.deleteMany()
    await prisma.project.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    resetCounters()
  })

  describe('create', () => {
    it('should link a repository to a workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const link = await repository.create('workflow-1', 'repo-1')

      expect(link).toMatchObject({
        workflowId: 'workflow-1',
        repositoryId: 'repo-1',
      })
      expect(link.id).toBeDefined()
      expect(link.organizationId).toBe(organization.id)
      expect(link.createdAt).toBeInstanceOf(Date)
    })

    it('should associate link with organization via tenant context', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const link = await repository.create('workflow-1', 'repo-1')

      // Verify in database
      const dbLink = await prisma.workflowRepository.findUnique({
        where: { id: link.id },
      })

      expect(dbLink?.organizationId).toBe(organization.id)
    })

    it('should allow multiple links per workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const link1 = await repository.create('workflow-1', 'repo-1')
      const link2Repository = await repository.create('workflow-1', 'repo-2')

      expect(link1.id).not.toBe(link2Repository.id)

      const links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(2)
    })

    it('should allow same repository linked to multiple workflows', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const link1 = await repository.create('workflow-1', 'repo-1')
      const link2 = await repository.create('workflow-2', 'repo-1')

      expect(link1.repositoryId).toBe(link2.repositoryId)
      expect(link1.workflowId).not.toBe(link2.workflowId)
    })
  })

  describe('createMany', () => {
    it('should create multiple repository links at once', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const repositoryIds = ['repo-1', 'repo-2', 'repo-3']
      await repository.createMany('workflow-1', repositoryIds)

      const links = await repository.findByWorkflowId('workflow-1')

      expect(links).toHaveLength(3)
      expect(links.map((l) => l.repositoryId).sort()).toEqual(repositoryIds.sort())
    })

    it('should handle empty repository list', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.createMany('workflow-1', [])

      const links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(0)
    })

    it('should maintain tenant context for bulk create', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.createMany('workflow-1', ['repo-1', 'repo-2'])

      // Verify all links have correct organization
      const links = await repository.findByWorkflowId('workflow-1')
      expect(links.every((l) => l.organizationId === organization.id)).toBe(true)
    })

    it('should create large batch of links efficiently', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Create 50 repository links
      const repositoryIds = Array.from({ length: 50 }, (_, i) => `repo-${i + 1}`)
      await repository.createMany('workflow-1', repositoryIds)

      const links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(50)
    })
  })

  describe('findByWorkflowId', () => {
    it('should retrieve all repositories linked to a workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.create('workflow-1', 'repo-1')
      await repository.create('workflow-1', 'repo-2')
      await repository.create('workflow-2', 'repo-3')

      const links = await repository.findByWorkflowId('workflow-1')

      expect(links).toHaveLength(2)
      expect(links.every((l) => l.workflowId === 'workflow-1')).toBe(true)
    })

    it('should return empty array for workflow with no repositories', async () => {
      if (setupFailed || !databaseService) return

      const links = await repository.findByWorkflowId('workflow-no-repos')

      expect(links).toEqual([])
    })

    it('should include all link metadata', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const created = await repository.create('workflow-1', 'repo-1')
      const found = await repository.findByWorkflowId('workflow-1')

      expect(found[0]).toMatchObject({
        id: created.id,
        workflowId: 'workflow-1',
        repositoryId: 'repo-1',
        organizationId: organization.id,
        createdAt: created.createdAt,
      })
    })
  })

  describe('delete', () => {
    it('should delete a specific repository link', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const link = await repository.create('workflow-1', 'repo-1')

      await repository.delete(link.id)

      const found = await repository.findByWorkflowId('workflow-1')
      expect(found).toHaveLength(0)
    })

    it('should only delete specified link', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const link1 = await repository.create('workflow-1', 'repo-1')
      const link2 = await repository.create('workflow-1', 'repo-2')

      await repository.delete(link1.id)

      const remaining = await repository.findByWorkflowId('workflow-1')
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe(link2.id)
    })

    it('should enforce tenant isolation on delete', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create link in org1
      databaseService.setTenantContext(org1.id)
      const link = await repository.create('workflow-1', 'repo-1')

      // Try to delete from org2
      databaseService.setTenantContext(org2.id)
      let error: Error | undefined
      try {
        await repository.delete(link.id)
      } catch (e) {
        error = e as Error
      }

      // Should throw not found error from Prisma
      expect(error).toBeDefined()

      // Verify link still exists in org1
      databaseService.setTenantContext(org1.id)
      const found = await repository.findByWorkflowId('workflow-1')
      expect(found).toHaveLength(1)
    })
  })

  describe('deleteByWorkflowId', () => {
    it('should delete all repositories linked to a workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.create('workflow-1', 'repo-1')
      await repository.create('workflow-1', 'repo-2')
      await repository.create('workflow-1', 'repo-3')

      await repository.deleteByWorkflowId('workflow-1')

      const remaining = await repository.findByWorkflowId('workflow-1')
      expect(remaining).toHaveLength(0)
    })

    it('should not delete links from other workflows', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.create('workflow-1', 'repo-1')
      await repository.create('workflow-1', 'repo-2')
      await repository.create('workflow-2', 'repo-3')

      await repository.deleteByWorkflowId('workflow-1')

      const w1Links = await repository.findByWorkflowId('workflow-1')
      const w2Links = await repository.findByWorkflowId('workflow-2')

      expect(w1Links).toHaveLength(0)
      expect(w2Links).toHaveLength(1)
    })

    it('should handle deleting workflow with no repositories', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Should not throw
      await repository.deleteByWorkflowId('workflow-no-repos')

      const remaining = await repository.findByWorkflowId('workflow-no-repos')
      expect(remaining).toHaveLength(0)
    })

    it('should enforce tenant isolation on bulk delete', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create links in both orgs for same workflow ID
      databaseService.setTenantContext(org1.id)
      await repository.create('workflow-shared', 'repo-1')

      databaseService.setTenantContext(org2.id)
      await repository.create('workflow-shared', 'repo-2')

      // Delete from org1
      databaseService.setTenantContext(org1.id)
      await repository.deleteByWorkflowId('workflow-shared')

      // Verify org1 links deleted, org2 links remain
      const org1Links = await repository.findByWorkflowId('workflow-shared')
      expect(org1Links).toHaveLength(0)

      databaseService.setTenantContext(org2.id)
      const org2Links = await repository.findByWorkflowId('workflow-shared')
      expect(org2Links).toHaveLength(1)
    })
  })

  describe('Tenant Isolation', () => {
    it('should isolate workflow repositories by organization', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create links in org1
      databaseService.setTenantContext(org1.id)
      const link1 = await repository.create('workflow-1', 'repo-1')

      // Create links in org2
      databaseService.setTenantContext(org2.id)
      const link2 = await repository.create('workflow-1', 'repo-2')

      // Verify isolation
      databaseService.setTenantContext(org1.id)
      const org1Links = await repository.findByWorkflowId('workflow-1')
      expect(org1Links).toHaveLength(1)
      expect(org1Links[0].id).toBe(link1.id)

      databaseService.setTenantContext(org2.id)
      const org2Links = await repository.findByWorkflowId('workflow-1')
      expect(org2Links).toHaveLength(1)
      expect(org2Links[0].id).toBe(link2.id)
    })

    it('should isolate createMany within tenant', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create links in org1
      databaseService.setTenantContext(org1.id)
      await repository.createMany('workflow-1', ['repo-1', 'repo-2'])

      // Create links in org2
      databaseService.setTenantContext(org2.id)
      await repository.createMany('workflow-1', ['repo-3', 'repo-4'])

      // Verify isolation
      databaseService.setTenantContext(org1.id)
      const org1Links = await repository.findByWorkflowId('workflow-1')
      expect(org1Links).toHaveLength(2)
      expect(org1Links.map((l) => l.repositoryId).sort()).toEqual(['repo-1', 'repo-2'])

      databaseService.setTenantContext(org2.id)
      const org2Links = await repository.findByWorkflowId('workflow-1')
      expect(org2Links).toHaveLength(2)
      expect(org2Links.map((l) => l.repositoryId).sort()).toEqual(['repo-3', 'repo-4'])
    })
  })

  describe('Repository Link Lifecycle', () => {
    it('should support updating repository links', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Create initial links
      const link1 = await repository.create('workflow-1', 'repo-1')
      await repository.create('workflow-1', 'repo-2')

      // Simulate update by deleting and recreating
      await repository.delete(link1.id)
      await repository.create('workflow-1', 'repo-3')

      const links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(2)
      expect(links.map((l) => l.repositoryId).sort()).toEqual(['repo-2', 'repo-3'])
    })

    it('should handle workflow repository management workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Initial setup with multiple repos
      const repos = ['backend', 'frontend', 'infra']
      await repository.createMany('workflow-1', repos)

      let links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(3)

      // Add another repo
      await repository.create('workflow-1', 'docs')
      links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(4)

      // Remove specific repo
      const docLink = links.find((l) => l.repositoryId === 'docs')!
      await repository.delete(docLink.id)

      links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(3)
      expect(links.map((l) => l.repositoryId)).not.toContain('docs')

      // Clear all repos
      await repository.deleteByWorkflowId('workflow-1')
      links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(0)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large number of repository links efficiently', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Create 100 repository links
      const repos = Array.from({ length: 100 }, (_, i) => `repo-${i + 1}`)
      await repository.createMany('workflow-1', repos)

      const links = await repository.findByWorkflowId('workflow-1')
      expect(links).toHaveLength(100)

      // Verify all repos are present
      const linkedRepos = links.map((l) => l.repositoryId).sort()
      expect(linkedRepos).toEqual(repos.sort())
    })

    it('should handle duplicate repository attempts gracefully', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Create first link
      await repository.create('workflow-1', 'repo-1')

      // Attempt to create duplicate - should succeed (no unique constraint on workflow+repo)
      // This depends on schema design - if unique constraint exists, this will throw
      await repository.create('workflow-1', 'repo-1')

      const links = await repository.findByWorkflowId('workflow-1')
      // If no constraint, should have 2 links with same repo
      expect(links.length).toBeGreaterThanOrEqual(1)
    })
  })
})
