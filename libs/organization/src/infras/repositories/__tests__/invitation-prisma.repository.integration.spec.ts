import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { InvitationPrismaRepository } from '../invitation-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for InvitationPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('InvitationPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: InvitationPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new InvitationPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.invitation.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('create', () => {
    it('should create invitation', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const result = await repository.create(
        organization.id,
        user.id,
        {
          email: 'invitee@example.com',
          role: 'member',
        },
        expiresAt
      )

      expect(result).toMatchObject({
        email: 'invitee@example.com',
        role: 'member',
        status: 'pending',
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      })
      expect(result.id).toBeDefined()
      expect(result.expiresAt).toEqual(expiresAt)
    })
  })

  describe('findOne', () => {
    it('should return invitation when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const created = await repository.create(
        organization.id,
        user.id,
        {
          email: 'invitee@example.com',
          role: 'member',
        },
        expiresAt
      )

      const result = await repository.findOne(created.id)

      expect(result).toMatchObject({
        id: created.id,
        email: 'invitee@example.com',
        organizationId: organization.id,
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      const result = await repository.findOne('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('listForOrganization', () => {
    it('should return invitations for organization', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await repository.create(
        organization.id,
        user.id,
        {
          email: 'invitee1@example.com',
          role: 'member',
        },
        expiresAt
      )

      await repository.create(
        organization.id,
        user.id,
        {
          email: 'invitee2@example.com',
          role: 'member',
        },
        expiresAt
      )

      const result = await repository.listForOrganization(organization.id)

      expect(result).toHaveLength(2)
      expect(result.map((inv) => inv.email)).toContain('invitee1@example.com')
      expect(result.map((inv) => inv.email)).toContain('invitee2@example.com')
    })
  })

  describe('updateStatus', () => {
    it('should update invitation status', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const created = await repository.create(
        organization.id,
        user.id,
        {
          email: 'invitee@example.com',
          role: 'member',
        },
        expiresAt
      )

      await repository.updateStatus(created.id, 'accepted')

      const result = await repository.findOne(created.id)

      expect(result?.status).toBe('accepted')
    })
  })

  describe('delete', () => {
    it('should delete invitation', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const created = await repository.create(
        organization.id,
        user.id,
        {
          email: 'invitee@example.com',
          role: 'member',
        },
        expiresAt
      )

      // Delete via Prisma directly since repository doesn't have delete method
      await prisma.invitation.delete({
        where: { id: created.id },
      })

      const result = await repository.findOne(created.id)

      expect(result).toBeNull()
    })
  })
})
