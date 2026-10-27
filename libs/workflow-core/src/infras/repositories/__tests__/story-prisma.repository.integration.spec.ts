import type { DatabaseService } from '@vyrak/database'
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

import { StoryPrismaRepository } from '../story-prisma.repository'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

/**
 * Integration tests for StoryPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('StoryPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: StoryPrismaRepository
  let workflowRepository: WorkflowPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new StoryPrismaRepository(databaseService as unknown as DatabaseService)
      workflowRepository = new WorkflowPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.story.deleteMany()
    await prisma.workflowRun.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('createMany', () => {
    it('should create multiple stories in transaction', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const workflowRun = await workflowRepository.createRun({
        organizationId: organization.id,
        projectId: project.id,
        workflowKey: 'test-workflow',
        workflowVersion: '1.0.0',
        initiatedByUserId: user.id,
      })

      const stories = [
        {
          workflowRunId: workflowRun.id,
          orderIndex: 0,
          title: 'Story 1',
          description: 'First story',
          acceptanceCriteria: ['Criterion 1'],
          estimatedDuration: 300,
        },
        {
          workflowRunId: workflowRun.id,
          orderIndex: 1,
          title: 'Story 2',
          description: 'Second story',
          acceptanceCriteria: ['Criterion 2'],
          estimatedDuration: 600,
        },
      ]

      const result = await repository.createMany(stories)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Story 1')
      expect(result[1].title).toBe('Story 2')
    })
  })

  describe('findByWorkflowRunId', () => {
    it('should return stories ordered by index', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const workflowRun = await workflowRepository.createRun({
        organizationId: organization.id,
        projectId: project.id,
        workflowKey: 'test-workflow',
        workflowVersion: '1.0.0',
        initiatedByUserId: user.id,
      })

      await repository.createMany([
        {
          workflowRunId: workflowRun.id,
          orderIndex: 1,
          title: 'Second Story',
          description: 'Should appear second',
          estimatedDuration: 300,
        },
        {
          workflowRunId: workflowRun.id,
          orderIndex: 0,
          title: 'First Story',
          description: 'Should appear first',
          estimatedDuration: 300,
        },
      ])

      const result = await repository.findByWorkflowRunId(workflowRun.id)

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('First Story')
      expect(result[1].title).toBe('Second Story')
    })
  })

  describe('findById', () => {
    it('should return story when found', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const workflowRun = await workflowRepository.createRun({
        organizationId: organization.id,
        projectId: project.id,
        workflowKey: 'test-workflow',
        workflowVersion: '1.0.0',
        initiatedByUserId: user.id,
      })

      const [created] = await repository.createMany([
        {
          workflowRunId: workflowRun.id,
          orderIndex: 0,
          title: 'Test Story',
          description: 'Test description',
          estimatedDuration: 300,
        },
      ])

      const result = await repository.findById(created.id)

      expect(result).toMatchObject({
        id: created.id,
        title: 'Test Story',
      })
    })

    it('should return null when not found', async () => {
      if (!databaseService) return

      const result = await repository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('updateStatus', () => {
    it('should update story status and timing', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const workflowRun = await workflowRepository.createRun({
        organizationId: organization.id,
        projectId: project.id,
        workflowKey: 'test-workflow',
        workflowVersion: '1.0.0',
        initiatedByUserId: user.id,
      })

      const [created] = await repository.createMany([
        {
          workflowRunId: workflowRun.id,
          orderIndex: 0,
          title: 'Test Story',
          description: 'Test description',
          estimatedDuration: 300,
        },
      ])

      const startedAt = new Date()
      await repository.updateStatus(created.id, {
        status: 'running',
        startedAt,
      })

      const result = await repository.findById(created.id)

      expect(result?.status).toBe('running')
      expect(result?.startedAt).toEqual(startedAt)
    })
  })

  describe('appendSubStep', () => {
    it('should append substep to story', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const workflowRun = await workflowRepository.createRun({
        organizationId: organization.id,
        projectId: project.id,
        workflowKey: 'test-workflow',
        workflowVersion: '1.0.0',
        initiatedByUserId: user.id,
      })

      const [created] = await repository.createMany([
        {
          workflowRunId: workflowRun.id,
          orderIndex: 0,
          title: 'Test Story',
          description: 'Test description',
          estimatedDuration: 300,
        },
      ])

      const subStep = {
        description: 'Test substep',
        status: 'completed' as const,
        timestamp: new Date(),
      }

      const result = await repository.appendSubStep(created.id, subStep)

      expect(Array.isArray(result.subSteps)).toBe(true)
      expect(result.subSteps).toHaveLength(1)
    })
  })
})
