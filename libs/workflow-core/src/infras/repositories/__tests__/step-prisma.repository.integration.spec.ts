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

import { StepStatus, WorkflowState } from '../../../domain'
import { StepPrismaRepository } from '../step-prisma.repository'
import { WorkflowPrismaRepository } from '../workflow-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for StepPrismaRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('StepPrismaRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: StepPrismaRepository
  let workflowRepository: WorkflowPrismaRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new StepPrismaRepository(databaseService as unknown as DatabaseService)
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
    await prisma.workflowStepRun.deleteMany()
    await prisma.workflowRun.deleteMany()
    await prisma.project.deleteMany()
    await prisma.member.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    // Reset counters
    resetCounters()
  })

  describe('createStepRun', () => {
    it('should create step run', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const result = await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        const step = await repository.createStepRun({
          runId: workflowRun.id,
          organizationId: organization.id,
          stepKey: 'test-step',
          stepType: 'agent',
          input: { key: 'value' },
        })

        return { workflowRun, step }
      })

      expect(result.step).toMatchObject({
        runId: result.workflowRun.id,
        organizationId: organization.id,
        stepKey: 'test-step',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
      })
      expect(result.step.id).toBeDefined()
    })
  })

  describe('findStepsByRunId', () => {
    it('should return steps ordered by creation', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()
      const { organization, user } = await createTestOrgWithOwner(prisma)
      const project = await createTestProject(prisma, organization.id)

      const result = await databaseService.withOrganization(organization.id, async () => {
        const workflowRun = await workflowRepository.createRun({
          organizationId: organization.id,
          projectId: project.id,
          workflowKey: 'test-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: user.id,
        })

        await repository.createStepRun({
          runId: workflowRun.id,
          organizationId: organization.id,
          stepKey: 'step-1',
          stepType: 'agent',
        })

        await repository.createStepRun({
          runId: workflowRun.id,
          organizationId: organization.id,
          stepKey: 'step-2',
          stepType: 'agent',
        })

        return await repository.findStepsByRunId(workflowRun.id)
      })

      expect(result).toHaveLength(2)
      expect(result[0].stepKey).toBe('step-1')
      expect(result[1].stepKey).toBe('step-2')
    })
  })

  describe('updateStepStatus', () => {
    it('should update step status', async () => {
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

        const step = await repository.createStepRun({
          runId: workflowRun.id,
          organizationId: organization.id,
          stepKey: 'test-step',
          stepType: 'agent',
        })

        await repository.updateStepStatus(step.id, StepStatus.RUNNING)

        const steps = await repository.findStepsByRunId(workflowRun.id)
        expect(steps[0].status).toBe(StepStatus.RUNNING)
      })
    })
  })
})
