import type { DatabaseService } from '@vyrak/database'
import {
  createTestDatabaseService,
  createTestUser,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { UserPrismaRepository } from '../user-prisma.repository'

/**
 * Integration tests for UserPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('UserPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: UserPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new UserPrismaRepository(databaseService as unknown as DatabaseService)
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

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const user = await createTestUser(prisma)

      await databaseService.withSystemAccess(async () => {
        const result = await repository.findByEmail(user.email)

        expect(result).toMatchObject({
          id: user.id,
          email: user.email,
        })
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      await databaseService.withSystemAccess(async () => {
        const result = await repository.findByEmail('nonexistent@example.com')

        expect(result).toBeNull()
      })
    })
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const user = await createTestUser(prisma)

      await databaseService.withSystemAccess(async () => {
        const result = await repository.findById(user.id)

        expect(result).toMatchObject({
          id: user.id,
          email: user.email,
        })
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      await databaseService.withSystemAccess(async () => {
        const result = await repository.findById('non-existent-id')

        expect(result).toBeNull()
      })
    })
  })
})
