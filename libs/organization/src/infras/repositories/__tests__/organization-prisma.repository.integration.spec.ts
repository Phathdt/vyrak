import type { DatabaseService } from '@vyrak/database'
import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  createTestUser,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { OrganizationPrismaRepository } from '../organization-prisma.repository'

/**
 * Integration tests for OrganizationPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 *
 * Note: Repository now handles withSystemAccess internally,
 * so tests no longer need to wrap calls manually.
 */
describe('OrganizationPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: OrganizationPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new OrganizationPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('create', () => {
    it('should create organization with owner member', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const user = await createTestUser(prisma)

      const result = await repository.create(user.id, {
        name: 'Test Org',
        slug: 'test-org',
      })

      expect(result).toMatchObject({
        name: 'Test Org',
        slug: 'test-org',
        role: 'owner',
        memberCount: 1,
      })
      expect(result.id).toBeDefined()

      // Verify in database
      const org = await prisma.organization.findUnique({
        where: { id: result.id },
        include: { members: true },
      })
      expect(org).toBeDefined()
      expect(org?.members).toHaveLength(1)
      expect(org?.members[0].userId).toBe(user.id)
      expect(org?.members[0].role).toBe('owner')
    })

    it('should reject duplicate slug', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { user, organization } = await createTestOrgWithOwner(prisma)

      await expect(
        repository.create(user.id, {
          name: 'Another Org',
          slug: organization.slug,
        })
      ).rejects.toThrow()
    })
  })

  describe('findAllForUser', () => {
    it('should return user organizations with roles', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { user, organization } = await createTestOrgWithOwner(prisma)

      const result = await repository.findAllForUser(user.id)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: 'owner',
      })
    })

    it('should return multiple organizations for user with multiple memberships', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const user = await createTestUser(prisma)
      const { organization: org1 } = await createTestOrgWithOwner(prisma, user)
      const { organization: org2 } = await createTestOrgWithOwner(prisma, user)

      const result = await repository.findAllForUser(user.id)

      expect(result).toHaveLength(2)
      const orgIds = result.map((o) => o.id).sort()
      expect(orgIds).toEqual([org1.id, org2.id].sort())
    })

    it('should return empty array for user without organizations', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const user = await createTestUser(prisma)

      const result = await repository.findAllForUser(user.id)

      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return organization if user is member', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { user, organization } = await createTestOrgWithOwner(prisma)

      const result = await repository.findOne(organization.id, user.id)

      expect(result).toMatchObject({
        id: organization.id,
        name: organization.name,
        role: 'owner',
      })
    })

    it('should return null if user is not member', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)
      const outsider = await createTestUser(prisma)

      const result = await repository.findOne(organization.id, outsider.id)

      expect(result).toBeNull()
    })

    it('should return null for non-existent organization', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const user = await createTestUser(prisma)

      const result = await repository.findOne('non-existent-id', user.id)

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update organization fields', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      const result = await repository.update(organization.id, {
        name: 'Updated Name',
      })

      expect(result).toMatchObject({
        id: organization.id,
        name: 'Updated Name',
        slug: organization.slug, // unchanged
      })

      // Verify in database
      const org = await prisma.organization.findUnique({
        where: { id: organization.id },
      })
      expect(org?.name).toBe('Updated Name')
    })

    it('should allow updating logo', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      const result = await repository.update(organization.id, {
        logo: 'https://example.com/logo.png',
      })

      expect(result.logo).toBe('https://example.com/logo.png')
    })
  })

  describe('delete', () => {
    it('should delete organization and cascade members', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      await repository.delete(organization.id)

      // Verify deleted
      const org = await prisma.organization.findUnique({
        where: { id: organization.id },
      })
      expect(org).toBeNull()

      // Verify members also deleted
      const members = await prisma.member.findMany({
        where: { organizationId: organization.id },
      })
      expect(members).toHaveLength(0)
    })
  })

  describe('findBySlug', () => {
    it('should find organization by slug', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      const result = await repository.findBySlug(organization.slug)

      expect(result).toMatchObject({
        id: organization.id,
      })
    })

    it('should return null for non-existent slug', async () => {
      if (!databaseService) return

      const result = await repository.findBySlug('non-existent-slug')

      expect(result).toBeNull()
    })
  })
})
