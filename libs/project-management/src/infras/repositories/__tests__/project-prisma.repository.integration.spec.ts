import type { DatabaseService } from '@vyrak/database'
import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ProjectPrismaRepository } from '../project-prisma.repository'

/**
 * Integration tests for ProjectPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('ProjectPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: ProjectPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new ProjectPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('create', () => {
    it('should create project with stats', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      await databaseService.withOrganization(organization.id, async () => {
        const result = await repository.create(organization.id, {
          name: 'Test Project',
          slug: 'test-project',
          description: 'Test description',
        })

        expect(result).toMatchObject({
          name: 'Test Project',
          slug: 'test-project',
          description: 'Test description',
          organizationId: organization.id,
        })
        expect(result.stats).toMatchObject({
          repositoryCount: 0,
          workflowRunCount: 0,
        })
        expect(result.id).toBeDefined()
        expect(result.createdAt).toBeInstanceOf(Date)
        expect(result.updatedAt).toBeInstanceOf(Date)

        // Verify in database
        const project = await prisma.project.findUnique({
          where: { id: result.id },
        })
        expect(project).toBeDefined()
        expect(project?.name).toBe('Test Project')
      })
    })
  })

  describe('findOne', () => {
    it('should return project when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      await databaseService.withOrganization(organization.id, async () => {
        const created = await repository.create(organization.id, {
          name: 'Test Project',
          slug: 'test-project',
        })

        const result = await repository.findOne(organization.id, created.id)

        expect(result).toMatchObject({
          id: created.id,
          name: 'Test Project',
          slug: 'test-project',
        })
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      await databaseService.withOrganization(organization.id, async () => {
        const result = await repository.findOne(organization.id, 'non-existent-id')

        expect(result).toBeNull()
      })
    })
  })

  describe('findAll', () => {
    it('should list projects with pagination', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      await databaseService.withOrganization(organization.id, async () => {
        // Create test projects
        await repository.create(organization.id, {
          name: 'Project 1',
          slug: 'project-1',
        })
        await repository.create(organization.id, {
          name: 'Project 2',
          slug: 'project-2',
        })

        const result = await repository.findAll(organization.id, {
          page: 1,
          limit: 10,
          sort: 'createdAt',
          order: 'desc',
        })

        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(2)
        expect(result).toMatchObject({
          page: 1,
          limit: 10,
          totalPages: 1,
        })
      })
    })
  })
})
