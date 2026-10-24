import type { PrismaClient } from '@vyrak/database'
import {
  createTestOrgWithOwner,
  createTestUser,
  getConnectionString,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AuthPrismaRepository } from './auth-prisma.repository'

describe('AuthPrismaRepository (Integration)', () => {
  let prisma: PrismaClient | undefined
  let repository: AuthPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const connectionString = await getConnectionString()
      prisma = await getPrismaClient(connectionString)
      repository = new AuthPrismaRepository(prisma)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect()
    }
    await stopPostgres()
  })

  beforeEach(async () => {
    if (!prisma) return

    // Clean up data
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('findUserById', () => {
    it('should return user with organizations when user exists', async () => {
      if (!prisma) return

      const { user, organization } = await createTestOrgWithOwner(prisma)

      const result = await repository.findUserById(user.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(user.id)
      expect(result?.email).toBe(user.email)
      expect(result?.members).toHaveLength(1)
      expect(result?.members[0].organization.id).toBe(organization.id)
    })

    it('should return user without organizations when user has no memberships', async () => {
      if (!prisma) return

      const user = await createTestUser(prisma)

      const result = await repository.findUserById(user.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(user.id)
      expect(result?.members).toHaveLength(0)
    })

    it('should return null when user does not exist', async () => {
      if (!prisma) return

      const result = await repository.findUserById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should include multiple organizations for user with multiple memberships', async () => {
      if (!prisma) return

      const user = await createTestUser(prisma)
      const { organization: org1 } = await createTestOrgWithOwner(prisma, user)
      const { organization: org2 } = await createTestOrgWithOwner(prisma, user)

      const result = await repository.findUserById(user.id)

      expect(result).toBeDefined()
      expect(result?.members).toHaveLength(2)
      const orgIds = result?.members.map((m) => m.organization.id).sort()
      expect(orgIds).toEqual([org1.id, org2.id].sort())
    })
  })

  describe('hasAnyOrganization', () => {
    it('should return true when user has organization', async () => {
      if (!prisma) return

      const { user } = await createTestOrgWithOwner(prisma)

      const result = await repository.hasAnyOrganization(user.id)

      expect(result).toBe(true)
    })

    it('should return false when user has no organization', async () => {
      if (!prisma) return

      const user = await createTestUser(prisma)

      const result = await repository.hasAnyOrganization(user.id)

      expect(result).toBe(false)
    })

    it('should return false when user does not exist', async () => {
      if (!prisma) return

      const result = await repository.hasAnyOrganization('non-existent-id')

      expect(result).toBe(false)
    })
  })

  describe('createPersonalOrganization', () => {
    it('should create personal organization with user name', async () => {
      if (!prisma) return

      const user = await createTestUser(prisma, { name: 'John Doe' })

      const result = await repository.createPersonalOrganization(user.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe("John Doe's Workspace")
      expect(result?.slug).toMatch(/^personal-/)

      // Verify in database
      const org = await prisma.organization.findUnique({
        where: { id: result!.id },
        include: { members: true },
      })

      expect(org).toBeDefined()
      expect(org?.members).toHaveLength(1)
      expect(org?.members[0].userId).toBe(user.id)
      expect(org?.members[0].role).toBe('owner')
    })

    it('should create personal organization without user name', async () => {
      if (!prisma) return

      const user = await createTestUser(prisma, { name: null })

      const result = await repository.createPersonalOrganization(user.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Personal Workspace')
      expect(result?.slug).toMatch(/^personal-/)
    })

    it('should return null when user does not exist', async () => {
      if (!prisma) return

      const result = await repository.createPersonalOrganization('non-existent-id')

      expect(result).toBeNull()
    })

    it('should create unique slug for each personal organization', async () => {
      if (!prisma) return

      const user1 = await createTestUser(prisma, { name: 'User One' })
      const user2 = await createTestUser(prisma, { name: 'User Two' })

      const result1 = await repository.createPersonalOrganization(user1.id)
      const result2 = await repository.createPersonalOrganization(user2.id)

      expect(result1?.slug).not.toBe(result2?.slug)
    })

    it('should allow creating personal org even if user already has organizations', async () => {
      if (!prisma) return

      const { user } = await createTestOrgWithOwner(prisma)

      const result = await repository.createPersonalOrganization(user.id)

      expect(result).toBeDefined()

      // Verify user now has 2 organizations
      const userWithOrgs = await repository.findUserById(user.id)
      expect(userWithOrgs?.members).toHaveLength(2)
    })
  })
})
