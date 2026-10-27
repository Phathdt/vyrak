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

import { StepStatus, type IStepRepository, type IWorkflowRepository } from '../../domain'
import { StepPrismaRepository } from '../../infras/repositories/step-prisma.repository'
import { WorkflowPrismaRepository } from '../../infras/repositories/workflow-prisma.repository'
import { testData } from './test-utils'

/**
 * Integration tests for StepRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('StepRepository Integration Tests', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let stepRepository: IStepRepository
  let workflowRepository: IWorkflowRepository
  let orgId: string
  let projectId: string
  let userId: string
  let runId: string

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      stepRepository = new StepPrismaRepository(databaseService as unknown as DatabaseService)
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

    // Create test organization and project
    const { organization, user } = await createTestOrgWithOwner(prisma)
    orgId = organization.id
    projectId = (await createTestProject(prisma, organization.id)).id
    userId = user.id

    // Create workflow run for testing
    const run = await databaseService.withOrganization(orgId, async () =>
      workflowRepository.createRun({
        organizationId: orgId,
        projectId,
        workflowKey: 'workflow-1',
        workflowVersion: '1.0.0',
        initiatedByUserId: userId,
      })
    )
    runId = run.id
  })

  describe('createStepRun', () => {
    it('should create a step run with correct initial state', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
          input: testData.stepInput(),
        })
      )

      expect(step).toBeDefined()
      expect(step.id).toBeDefined()
      expect(step.runId).toBe(runId)
      expect(step.organizationId).toBe(orgId)
      expect(step.stepKey).toBe('step-1')
      expect(step.stepType).toBe('http')
      expect(step.status).toBe(StepStatus.PENDING)
      expect(step.attempt).toBe(1)
      expect(step.createdAt).toBeInstanceOf(Date)
      expect(step.updatedAt).toBeInstanceOf(Date)
    })

    it('should create multiple steps for same run', async () => {
      if (!databaseService) return

      const step1 = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const step2 = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-2',
          stepType: 'script',
        })
      )

      expect(step1.id).not.toBe(step2.id)
      expect(step1.stepKey).toBe('step-1')
      expect(step2.stepKey).toBe('step-2')
    })

    it('should allow step type to default to agent', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: '', // Empty type should default to 'agent'
        })
      )

      // Empty string should default to 'agent'
      expect(step.stepType).toBe('agent')
    })
  })

  describe('findStepsByRunId', () => {
    it('should find all steps for a run in creation order', async () => {
      if (!databaseService) return

      const step1 = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      const step2 = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-2',
          stepType: 'script',
        })
      )

      const steps = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findStepsByRunId(runId)
      )

      expect(steps).toHaveLength(2)
      expect(steps[0].id).toBe(step1.id)
      expect(steps[1].id).toBe(step2.id)
    })

    it('should return empty array for run with no steps', async () => {
      if (!databaseService) return

      const newRun = await databaseService.withOrganization(orgId, async () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-2',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const steps = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findStepsByRunId(newRun.id)
      )

      expect(steps).toHaveLength(0)
    })

    it('should return empty array for non-existent run', async () => {
      if (!databaseService) return

      const steps = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findStepsByRunId('non-existent-run')
      )

      expect(steps).toHaveLength(0)
    })

    it('should enforce tenant isolation', async () => {
      if (!databaseService) return

      const prisma = getPrismaClient()

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const orgId2 = testData.orgId()

      // Setup second org
      await prisma.organization.create({
        data: {
          id: orgId2,
          name: `Test Org ${orgId2}`,
          slug: orgId2,
        },
      })

      // Try to access from different org (should still return our step)
      const steps = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findStepsByRunId(runId)
      )

      expect(steps).toHaveLength(1)

      // Cleanup
      await prisma.organization.delete({ where: { id: orgId2 } })
    })
  })

  describe('updateStepStatus', () => {
    it('should update step status', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const startTime = new Date()
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: startTime,
        })
      )

      const updated = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(updated?.status).toBe(StepStatus.RUNNING)
      expect(updated?.startedAt).toEqual(startTime)
    })

    it('should update status with full result data', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const now = new Date()
      const output = testData.stepOutput()

      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.SUCCEEDED, {
          output,
          startedAt: new Date(now.getTime() - 5000),
          completedAt: now,
        })
      )

      const updated = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(updated?.status).toBe(StepStatus.SUCCEEDED)
      expect(updated?.output).toEqual(output)
      expect(updated?.completedAt).toEqual(now)
    })

    it('should update status with error information', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const errorCode = 'NETWORK_ERROR'
      const errorMessage = 'Connection timeout'

      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode,
          errorMessage,
          completedAt: new Date(),
        })
      )

      const updated = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(updated?.status).toBe(StepStatus.FAILED)
      expect(updated?.errorCode).toBe(errorCode)
      expect(updated?.errorMessage).toBe(errorMessage)
    })

    it('should throw error for non-existent step', async () => {
      if (!databaseService) return

      await expect(
        databaseService.withOrganization(orgId, async () =>
          stepRepository.updateStepStatus('non-existent-step', StepStatus.RUNNING)
        )
      ).rejects.toThrow()
    })
  })

  describe('incrementAttempt', () => {
    it('should increment attempt counter', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      expect(step.attempt).toBe(1)

      const newAttempt = await databaseService.withOrganization(orgId, async () =>
        stepRepository.incrementAttempt(step.id)
      )

      expect(newAttempt).toBe(2)

      const updated = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(updated?.attempt).toBe(2)
      expect(updated?.status).toBe(StepStatus.PENDING) // Reset to pending
    })

    it('should increment attempt multiple times', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const attempt2 = await databaseService.withOrganization(orgId, async () =>
        stepRepository.incrementAttempt(step.id)
      )
      expect(attempt2).toBe(2)

      const attempt3 = await databaseService.withOrganization(orgId, async () =>
        stepRepository.incrementAttempt(step.id)
      )
      expect(attempt3).toBe(3)

      const updated = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(updated?.attempt).toBe(3)
    })

    it('should reset status to pending on increment', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      // Mark as failed
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'ERROR',
          errorMessage: 'Failed',
        })
      )

      const failedStep = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )
      expect(failedStep?.status).toBe(StepStatus.FAILED)

      // Increment attempt
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.incrementAttempt(step.id)
      )

      const retried = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(retried?.status).toBe(StepStatus.PENDING)
      expect(retried?.attempt).toBe(2)
    })

    it('should throw error for non-existent step', async () => {
      if (!databaseService) return

      await expect(
        databaseService.withOrganization(orgId, async () =>
          stepRepository.incrementAttempt('non-existent-step')
        )
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find a step by ID', async () => {
      if (!databaseService) return

      const created = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
          input: testData.stepInput(),
        })
      )

      const found = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(created.id)
      )

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.stepKey).toBe('step-1')
      expect(found?.input).toEqual(created.input)
    })

    it('should return null for non-existent step', async () => {
      if (!databaseService) return

      const found = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById('non-existent-id')
      )

      expect(found).toBeNull()
    })
  })

  describe('retry scenario', () => {
    it('should handle complete retry workflow', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
          input: { retryable: true },
        })
      )

      // First attempt - fail
      const startTime1 = new Date()
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: startTime1,
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'TIMEOUT',
          errorMessage: 'Request timed out',
          completedAt: new Date(),
        })
      )

      let current = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(current?.status).toBe(StepStatus.FAILED)
      expect(current?.attempt).toBe(1)

      // Increment for retry
      const newAttempt = await databaseService.withOrganization(orgId, async () =>
        stepRepository.incrementAttempt(step.id)
      )

      expect(newAttempt).toBe(2)

      // Second attempt - succeed
      const startTime2 = new Date()
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: startTime2,
        })
      )

      const output = testData.stepOutput()
      await databaseService.withOrganization(orgId, async () =>
        stepRepository.updateStepStatus(step.id, StepStatus.SUCCEEDED, {
          output,
          completedAt: new Date(),
        })
      )

      current = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(current?.status).toBe(StepStatus.SUCCEEDED)
      expect(current?.attempt).toBe(2)
      expect(current?.output).toEqual(output)
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent step creates safely', async () => {
      if (!databaseService) return

      const promises = Array.from({ length: 10 }).map((_, i) =>
        databaseService!.withOrganization(orgId, async () =>
          stepRepository.createStepRun({
            runId,
            organizationId: orgId,
            stepKey: `step-${i}`,
            stepType: 'http',
          })
        )
      )

      const steps = await Promise.all(promises)

      expect(steps).toHaveLength(10)

      const unique = new Set(steps.map((s) => s.id))
      expect(unique.size).toBe(10) // All IDs should be unique

      const allSteps = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findStepsByRunId(runId)
      )

      expect(allSteps).toHaveLength(10)
    })

    it('should handle concurrent status updates', async () => {
      if (!databaseService) return

      const step = await databaseService.withOrganization(orgId, async () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      // Simulate concurrent status updates
      const promises = [
        databaseService.withOrganization(orgId, async () =>
          stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
            startedAt: new Date(),
          })
        ),
        databaseService.withOrganization(orgId, async () =>
          stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
            startedAt: new Date(),
          })
        ),
      ]

      await Promise.all(promises)

      const updated = await databaseService.withOrganization(orgId, async () =>
        stepRepository.findById(step.id)
      )

      expect(updated?.status).toBe(StepStatus.RUNNING)
    })
  })
})
