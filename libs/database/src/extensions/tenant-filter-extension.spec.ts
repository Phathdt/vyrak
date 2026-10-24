import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createTenantFilterExtension } from './tenant-filter-extension'

import type { PrismaClient } from '../generated/prisma/client'
import {
  createTestOrganization,
  createTestOrgWithOwner,
  createTestUser,
  resetCounters,
} from '../test-utils/test-data-factories'
import { setupTestDatabase } from '../test-utils/testcontainer-setup'

describe.skipIf(process.env.CI)('TenantFilterExtension (Integration)', () => {
  let prisma: PrismaClient
  let cleanup: () => Promise<void>
  let extendedClient: any

  let org1Id: string
  let org2Id: string
  let user1Id: string
  let user2Id: string

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    prisma = setup.prisma
    cleanup = setup.cleanup
  })

  afterAll(async () => {
    await cleanup()
  })

  beforeEach(async () => {
    resetCounters()

    // Clean up all data
    await prisma.organizationMember.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    const user1 = await prisma.user.create({
      data: createTestUser({ email: 'user1@test.com', name: 'User 1' }),
    })
    const user2 = await prisma.user.create({
      data: createTestUser({ email: 'user2@test.com', name: 'User 2' }),
    })

    user1Id = user1.id
    user2Id = user2.id

    // Create organizations with owner memberships
    const org1 = await createTestOrgWithOwner(prisma, user1Id, {
      name: 'Organization 1',
      slug: 'org-1',
    })
    const org2 = await createTestOrgWithOwner(prisma, user2Id, {
      name: 'Organization 2',
      slug: 'org-2',
    })

    org1Id = org1.id
    org2Id = org2.id

    // Setup extended client with tenant filter
    let tenantContext: { organizationId?: string; bypassTenantFilter?: boolean } = {}

    extendedClient = prisma.$extends(createTenantFilterExtension(() => tenantContext))

    // Helper to set context
    extendedClient.setContext = (orgId?: string, bypass = false) => {
      tenantContext = {
        organizationId: orgId,
        bypassTenantFilter: bypass,
      }
    }
  })

  describe('findMany operations', () => {
    it('should filter organizations by tenant context', async () => {
      extendedClient.setContext(org1Id)

      const orgs = await extendedClient.organization.findMany()

      expect(orgs).toHaveLength(1)
      expect(orgs[0].id).toBe(org1Id)
    })

    it('should throw error when tenant context missing', async () => {
      extendedClient.setContext(undefined)

      await expect(extendedClient.organization.findMany()).rejects.toThrow('Tenant context required')
    })

    it('should bypass filter when flag set', async () => {
      extendedClient.setContext(undefined, true)

      const orgs = await extendedClient.organization.findMany()

      expect(orgs.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter organization members by organizationId', async () => {
      extendedClient.setContext(org1Id)

      const members = await extendedClient.organizationMember.findMany()

      expect(members).toHaveLength(1)
      expect(members[0].userId).toBe(user1Id)
      expect(members[0].organizationId).toBe(org1Id)
    })
  })

  describe('findUnique operations', () => {
    it('should find organization by id with tenant filter', async () => {
      extendedClient.setContext(org1Id)

      const org = await extendedClient.organization.findUnique({
        where: { id: org1Id },
      })

      expect(org).toBeTruthy()
      expect(org.id).toBe(org1Id)
    })

    it('should return null when accessing other tenant organization', async () => {
      extendedClient.setContext(org1Id)

      const org = await extendedClient.organization.findUnique({
        where: { id: org2Id },
      })

      expect(org).toBeNull()
    })

    it('should throw error when tenant context missing', async () => {
      extendedClient.setContext(undefined)

      await expect(
        extendedClient.organization.findUnique({
          where: { id: org1Id },
        })
      ).rejects.toThrow('Tenant context required')
    })
  })

  describe('create operations', () => {
    it('should auto-assign organizationId when creating member', async () => {
      extendedClient.setContext(org1Id)

      const member = await extendedClient.organizationMember.create({
        data: {
          userId: user2Id,
          role: 'member',
        },
      })

      expect(member.organizationId).toBe(org1Id)
    })

    it('should throw error when trying to create with different organizationId', async () => {
      extendedClient.setContext(org1Id)

      await expect(
        extendedClient.organizationMember.create({
          data: {
            organizationId: org2Id,
            userId: user2Id,
            role: 'member',
          },
        })
      ).rejects.toThrow('Cannot create')
    })

    it('should throw error when tenant context missing', async () => {
      extendedClient.setContext(undefined)

      await expect(
        extendedClient.organizationMember.create({
          data: {
            userId: user2Id,
            role: 'member',
          },
        })
      ).rejects.toThrow('Tenant context required')
    })
  })

  describe('update operations', () => {
    it('should update member within same organization', async () => {
      extendedClient.setContext(org1Id)

      const members = await extendedClient.organizationMember.findMany()
      const memberId = members[0].id

      const updated = await extendedClient.organizationMember.update({
        where: { id: memberId },
        data: { role: 'admin' },
      })

      expect(updated.role).toBe('admin')
    })

    it('should not update member from different organization', async () => {
      extendedClient.setContext(org1Id)

      const org2Members = await prisma.organizationMember.findMany({
        where: { organizationId: org2Id },
      })
      const org2MemberId = org2Members[0].id

      const result = await extendedClient.organizationMember.update({
        where: { id: org2MemberId },
        data: { role: 'admin' },
      })

      // Update returns null when no record found with tenant filter
      expect(result).toBeNull()
    })

    it('should prevent changing organizationId', async () => {
      extendedClient.setContext(org1Id)

      const members = await extendedClient.organizationMember.findMany()
      const memberId = members[0].id

      await expect(
        extendedClient.organizationMember.update({
          where: { id: memberId },
          data: { organizationId: org2Id },
        })
      ).rejects.toThrow('Cannot change organizationId')
    })
  })

  describe('delete operations', () => {
    it('should delete member within same organization', async () => {
      // Create additional member to delete
      const member = await prisma.organizationMember.create({
        data: {
          organizationId: org1Id,
          userId: user2Id,
          role: 'member',
        },
      })

      extendedClient.setContext(org1Id)

      const deleted = await extendedClient.organizationMember.delete({
        where: { id: member.id },
      })

      expect(deleted.id).toBe(member.id)

      // Verify deletion
      const found = await prisma.organizationMember.findUnique({
        where: { id: member.id },
      })
      expect(found).toBeNull()
    })

    it('should not delete member from different organization', async () => {
      extendedClient.setContext(org1Id)

      const org2Members = await prisma.organizationMember.findMany({
        where: { organizationId: org2Id },
      })
      const org2MemberId = org2Members[0].id

      const result = await extendedClient.organizationMember.delete({
        where: { id: org2MemberId },
      })

      // Delete returns null when no record found with tenant filter
      expect(result).toBeNull()

      // Verify member still exists
      const found = await prisma.organizationMember.findUnique({
        where: { id: org2MemberId },
      })
      expect(found).toBeTruthy()
    })
  })

  describe('count and aggregate operations', () => {
    it('should count only tenant-owned records', async () => {
      extendedClient.setContext(org1Id)

      const count = await extendedClient.organizationMember.count()

      expect(count).toBe(1)
    })

    it('should aggregate only tenant-owned records', async () => {
      extendedClient.setContext(org1Id)

      const result = await extendedClient.organizationMember.aggregate({
        _count: true,
      })

      expect(result._count).toBe(1)
    })
  })

  describe('Organization model special handling', () => {
    it('should use id field as organizationId for Organization model', async () => {
      extendedClient.setContext(org1Id)

      const org = await extendedClient.organization.findFirst()

      expect(org.id).toBe(org1Id)
    })

    it('should filter by id when querying Organization', async () => {
      extendedClient.setContext(org1Id)

      const orgs = await extendedClient.organization.findMany()

      expect(orgs).toHaveLength(1)
      expect(orgs[0].id).toBe(org1Id)
    })
  })

  describe('Non-tenant models', () => {
    it('should not filter User model (not tenant-owned)', async () => {
      extendedClient.setContext(org1Id)

      const users = await extendedClient.user.findMany()

      // Users are not tenant-owned, should see all
      expect(users.length).toBeGreaterThanOrEqual(2)
    })
  })
})
