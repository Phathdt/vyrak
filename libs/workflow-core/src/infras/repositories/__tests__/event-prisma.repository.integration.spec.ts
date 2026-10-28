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

import { EventPrismaRepository } from '../event-prisma.repository'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

/**
 * Integration tests for EventPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('EventPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: EventPrismaRepository
  let workflowRepository: WorkflowPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new EventPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.workflowEvent.deleteMany()
    await prisma.workflowRun.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('appendEvent', () => {
    it('should record workflow event', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const result = await repository.appendEvent({
          runId: workflowRun.id,
          organizationId: organization.id,
          eventType: 'workflow.started',
          payload: { message: 'Workflow started' },
        })

        expect(result).toMatchObject({
          runId: workflowRun.id,
          organizationId: organization.id,
          eventType: 'workflow.started',
        })
        expect(result.id).toBeDefined()
        expect(result.createdAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('findEventsByRunId', () => {
    it('should return events ordered by timestamp', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        await repository.appendEvent({
          runId: workflowRun.id,
          organizationId: organization.id,
          eventType: 'workflow.started',
          payload: {},
        })

        await repository.appendEvent({
          runId: workflowRun.id,
          organizationId: organization.id,
          eventType: 'workflow.completed',
          payload: {},
        })

        const result = await repository.findEventsByRunId(workflowRun.id)

        expect(result).toHaveLength(2)
        expect(result[0].eventType).toBe('workflow.started')
        expect(result[1].eventType).toBe('workflow.completed')
      })
    })
  })
})
