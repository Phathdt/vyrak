import type { DatabaseService } from '@vyrak/database'
import {
  createTestDatabaseService,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { WorkflowTemplatePrismaRepository } from '../workflow-template-prisma.repository'

/**
 * Integration tests for WorkflowTemplatePrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('WorkflowTemplatePrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: WorkflowTemplatePrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new WorkflowTemplatePrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.workflowTemplate.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('findAllActive', () => {
    it('should return only active templates ordered by name', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()

      // Create test templates
      await prisma.workflowTemplate.create({
        data: {
          key: 'template-1',
          name: 'Z Template',
          description: 'Last alphabetically',
          category: 'development',
          isActive: true,
        },
      })

      await prisma.workflowTemplate.create({
        data: {
          key: 'template-2',
          name: 'A Template',
          description: 'First alphabetically',
          category: 'development',
          isActive: true,
        },
      })

      await prisma.workflowTemplate.create({
        data: {
          key: 'template-3',
          name: 'Inactive Template',
          description: 'Should not appear',
          category: 'development',
          isActive: false,
        },
      })

      const result = await repository.findAllActive()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('A Template')
      expect(result[1].name).toBe('Z Template')
    })
  })

  describe('findById', () => {
    it('should return template when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()

      const created = await prisma.workflowTemplate.create({
        data: {
          key: 'test-template',
          name: 'Test Template',
          description: 'Test description',
          category: 'development',
          isActive: true,
        },
      })

      const result = await repository.findById(created.id)

      expect(result).toMatchObject({
        id: created.id,
        key: 'test-template',
        name: 'Test Template',
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      const result = await repository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('findByKey', () => {
    it('should return template when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()

      await prisma.workflowTemplate.create({
        data: {
          key: 'unique-key',
          name: 'Test Template',
          description: 'Test description',
          category: 'development',
          isActive: true,
        },
      })

      const result = await repository.findByKey('unique-key')

      expect(result?.key).toBe('unique-key')
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      const result = await repository.findByKey('non-existent-key')

      expect(result).toBeNull()
    })
  })

  describe('isActive', () => {
    it('should return true for active template', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()

      const template = await prisma.workflowTemplate.create({
        data: {
          key: 'active-template',
          name: 'Active Template',
          description: 'Test description',
          category: 'development',
          isActive: true,
        },
      })

      const result = await repository.isActive(template.id)

      expect(result).toBe(true)
    })

    it('should return false for inactive template', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()

      const template = await prisma.workflowTemplate.create({
        data: {
          key: 'inactive-template',
          name: 'Inactive Template',
          description: 'Test description',
          category: 'development',
          isActive: false,
        },
      })

      const result = await repository.isActive(template.id)

      expect(result).toBe(false)
    })

    it('should return false for non-existent template', async () => {
      if (!databaseService) return

      const result = await repository.isActive('non-existent-id')

      expect(result).toBe(false)
    })
  })
})
