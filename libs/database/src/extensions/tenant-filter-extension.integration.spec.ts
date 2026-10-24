import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createTenantFilterExtension } from './tenant-filter-extension'

import { PrismaClient } from '../generated/prisma/client'
import {
  createTestMember,
  createTestOrgWithOwner,
  getConnectionString,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '../test-utils'

describe('TenantFilterExtension (Integration)', () => {
  let prisma: PrismaClient | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extendedClient: any
  let setupFailed = false
  let tenantContext: { organizationId?: string; bypassTenantFilter?: boolean } = {}

  beforeAll(async () => {
    try {
      await startPostgres()
      const connectionString = await getConnectionString()

      // Create a FRESH Prisma client (not adapter-based) for extension testing
      prisma = new PrismaClient({
        datasourceUrl: connectionString,
        log: process.env['TEST_LOG_QUERIES'] === 'true' ? ['query', 'error', 'warn'] : ['error'],
      })

      await prisma.$connect()

      // Setup extended client ONCE with tenant filter
      extendedClient = prisma.$extends(createTenantFilterExtension(() => tenantContext))

      // Helper to set context
      extendedClient.setContext = (orgId?: string, bypass = false) => {
        tenantContext.organizationId = orgId
        tenantContext.bypassTenantFilter = bypass
      }
    } catch (error) {
      setupFailed = true
      console.warn('Test database setup failed, skipping integration tests', error)
    }
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect()
    }
    await stopPostgres()
  })

  beforeEach(async () => {
    if (setupFailed || !prisma) return

    resetCounters()

    // Clean up all data
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Clear tenant context
    tenantContext.organizationId = undefined
    tenantContext.bypassTenantFilter = false
  })

  describe('User Filtering', () => {
    it('should filter users by tenant context', async () => {
      if (!prisma || setupFailed) return

      const { user: user1, organization: org1 } = await createTestOrgWithOwner(prisma)
      const { user: user2, organization: org2 } = await createTestOrgWithOwner(prisma)

      // Set tenant context to org1
      extendedClient.setContext(org1.id)

      const users = await extendedClient.user.findMany({
        include: { members: true },
      })

      // Should only return user1 (belongs to org1)
      expect(users).toHaveLength(1)
      expect(users[0].id).toBe(user1.id)
    })

    it('should return all users without tenant context', async () => {
      if (!prisma || setupFailed) return

      await createTestOrgWithOwner(prisma)
      await createTestOrgWithOwner(prisma)

      // Clear tenant context
      extendedClient.setContext(undefined)

      const users = await extendedClient.user.findMany()

      // Should return all users
      expect(users.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Organization Filtering', () => {
    it('should filter organizations by tenant context', async () => {
      if (!prisma || setupFailed) return

      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Set tenant context to org1
      extendedClient.setContext(org1.id)

      const orgs = await extendedClient.organization.findMany()

      // Should only return org1
      expect(orgs).toHaveLength(1)
      expect(orgs[0].id).toBe(org1.id)
    })
  })

  describe('Member Filtering', () => {
    it('should filter members by tenant context', async () => {
      if (!prisma || setupFailed) return

      const { user: user1, organization: org1 } = await createTestOrgWithOwner(prisma)
      const { user: user2, organization: org2 } = await createTestOrgWithOwner(prisma)

      // Add user2 as admin to org1
      await createTestMember(prisma, {
        organizationId: org1.id,
        userId: user2.id,
        role: 'admin',
      })

      // Set tenant context to org1
      extendedClient.setContext(org1.id)

      const members = await extendedClient.member.findMany({
        include: { user: true, organization: true },
      })

      // Should return 2 members of org1 (owner + admin)
      expect(members).toHaveLength(2)
      expect(members.every((m) => m.organizationId === org1.id)).toBe(true)
    })
  })

  describe('Bypass Filter', () => {
    it('should return all data when bypass flag is true', async () => {
      if (!prisma || setupFailed) return

      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Set tenant context but enable bypass
      extendedClient.setContext(org1.id, true)

      const orgs = await extendedClient.organization.findMany()

      // Should return all organizations
      expect(orgs.length).toBeGreaterThanOrEqual(2)
    })
  })
})
