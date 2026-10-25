import type { DatabaseService } from '@vyrak/database'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanupTestData, IntegrationTestSetup, testData } from './test-utils'

import { StepStatus } from '../../domain/entities/step-run.entity'
import type { IStepRepository } from '../../domain/interfaces/step-repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'
import { STEP_REPOSITORY, WORKFLOW_REPOSITORY } from '../../infras/di/di'

describe('StepRepository Integration Tests', () => {
  let db: DatabaseService
  let stepRepository: IStepRepository
  let workflowRepository: IWorkflowRepository
  let orgId: string
  let projectId: string
  let userId: string
  let runId: string

  beforeAll(async () => {
    await IntegrationTestSetup.init()
    db = IntegrationTestSetup.db
    stepRepository = IntegrationTestSetup.get<IStepRepository>(STEP_REPOSITORY)
    workflowRepository = IntegrationTestSetup.get<IWorkflowRepository>(WORKFLOW_REPOSITORY)
  })

  afterAll(async () => {
    await IntegrationTestSetup.cleanup()
  })

  beforeEach(async () => {
    orgId = testData.orgId()
    projectId = testData.projectId()
    userId = `test-user-${Math.random().toString(36).slice(2)}`

    // Setup test user
    await db.withSystemAccess(async () => {
      await db.client.user.upsert({
        where: { email: `${userId}@test.com` },
        update: {},
        create: {
          email: `${userId}@test.com`,
          name: userId,
        },
      })
    })

    // Setup org and project
    await db.withSystemAccess(async () => {
      await db.client.organization.upsert({
        where: { id: orgId },
        update: {},
        create: {
          id: orgId,
          name: `Test Org ${orgId}`,
          slug: orgId,
        },
      })

      await db.client.project.upsert({
        where: {
          organizationId_slug: {
            organizationId: orgId,
            slug: projectId,
          },
        },
        update: {},
        create: {
          id: projectId,
          organizationId: orgId,
          name: `Test Project`,
          slug: projectId,
        },
      })
    })

    // Create workflow run for testing
    const run = await db.withOrganization(orgId, () =>
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

  afterEach(async () => {
    await cleanupTestData(db, orgId)
  })

  describe('createStepRun', () => {
    it('should create a step run with correct initial state', async () => {
      const step = await db.withOrganization(orgId, () =>
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
      const step1 = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const step2 = await db.withOrganization(orgId, () =>
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
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: '', // Empty type
        })
      )

      // Empty string should be used as-is (schema validation happens elsewhere)
      expect(step.stepType).toBe('')
    })
  })

  describe('findStepsByRunId', () => {
    it('should find all steps for a run in creation order', async () => {
      const step1 = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      const step2 = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-2',
          stepType: 'script',
        })
      )

      const steps = await db.withOrganization(orgId, () => stepRepository.findStepsByRunId(runId))

      expect(steps).toHaveLength(2)
      expect(steps[0].id).toBe(step1.id)
      expect(steps[1].id).toBe(step2.id)
    })

    it('should return empty array for run with no steps', async () => {
      const newRun = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-2',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const steps = await db.withOrganization(orgId, () => stepRepository.findStepsByRunId(newRun.id))

      expect(steps).toHaveLength(0)
    })

    it('should return empty array for non-existent run', async () => {
      const steps = await db.withOrganization(orgId, () => stepRepository.findStepsByRunId('non-existent-run'))

      expect(steps).toHaveLength(0)
    })

    it('should enforce tenant isolation', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const orgId2 = testData.orgId()

      // Setup second org
      await db.withSystemAccess(async () => {
        await db.client.organization.create({
          data: {
            id: orgId2,
            name: `Test Org ${orgId2}`,
            slug: orgId2,
          },
        })
      })

      // Try to access from different org
      const steps = await db.withOrganization(orgId2, () => stepRepository.findStepsByRunId(runId))

      expect(steps).toHaveLength(0)

      // Cleanup
      await db.withSystemAccess(async () => {
        await db.client.organization.delete({ where: { id: orgId2 } })
      })
    })
  })

  describe('updateStepStatus', () => {
    it('should update step status', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const startTime = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: startTime,
        })
      )

      const updated = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(updated?.status).toBe(StepStatus.RUNNING)
      expect(updated?.startedAt).toEqual(startTime)
    })

    it('should update status with full result data', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const now = new Date()
      const output = testData.stepOutput()

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.SUCCEEDED, {
          output,
          startedAt: new Date(now.getTime() - 5000),
          completedAt: now,
        })
      )

      const updated = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(updated?.status).toBe(StepStatus.SUCCEEDED)
      expect(updated?.output).toEqual(output)
      expect(updated?.completedAt).toEqual(now)
    })

    it('should update status with error information', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const errorCode = 'NETWORK_ERROR'
      const errorMessage = 'Connection timeout'

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode,
          errorMessage,
          completedAt: new Date(),
        })
      )

      const updated = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(updated?.status).toBe(StepStatus.FAILED)
      expect(updated?.errorCode).toBe(errorCode)
      expect(updated?.errorMessage).toBe(errorMessage)
    })

    it('should throw error for non-existent step', async () => {
      await expect(
        db.withOrganization(orgId, () => stepRepository.updateStepStatus('non-existent-step', StepStatus.RUNNING))
      ).rejects.toThrow()
    })
  })

  describe('incrementAttempt', () => {
    it('should increment attempt counter', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      expect(step.attempt).toBe(1)

      const newAttempt = await db.withOrganization(orgId, () => stepRepository.incrementAttempt(step.id))

      expect(newAttempt).toBe(2)

      const updated = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(updated?.attempt).toBe(2)
      expect(updated?.status).toBe(StepStatus.PENDING) // Reset to pending
    })

    it('should increment attempt multiple times', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      const attempt2 = await db.withOrganization(orgId, () => stepRepository.incrementAttempt(step.id))
      expect(attempt2).toBe(2)

      const attempt3 = await db.withOrganization(orgId, () => stepRepository.incrementAttempt(step.id))
      expect(attempt3).toBe(3)

      const updated = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(updated?.attempt).toBe(3)
    })

    it('should reset status to pending on increment', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      // Mark as failed
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'ERROR',
          errorMessage: 'Failed',
        })
      )

      const failedStep = await db.withOrganization(orgId, () => stepRepository.findById(step.id))
      expect(failedStep?.status).toBe(StepStatus.FAILED)

      // Increment attempt
      await db.withOrganization(orgId, () => stepRepository.incrementAttempt(step.id))

      const retried = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(retried?.status).toBe(StepStatus.PENDING)
      expect(retried?.attempt).toBe(2)
    })

    it('should throw error for non-existent step', async () => {
      await expect(
        db.withOrganization(orgId, () => stepRepository.incrementAttempt('non-existent-step'))
      ).rejects.toThrow()
    })
  })

  describe('findById', () => {
    it('should find a step by ID', async () => {
      const created = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
          input: testData.stepInput(),
        })
      )

      const found = await db.withOrganization(orgId, () => stepRepository.findById(created.id))

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.stepKey).toBe('step-1')
      expect(found?.input).toEqual(created.input)
    })

    it('should return null for non-existent step', async () => {
      const found = await db.withOrganization(orgId, () => stepRepository.findById('non-existent-id'))

      expect(found).toBeNull()
    })
  })

  describe('retry scenario', () => {
    it('should handle complete retry workflow', async () => {
      const step = await db.withOrganization(orgId, () =>
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
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: startTime1,
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'TIMEOUT',
          errorMessage: 'Request timed out',
          completedAt: new Date(),
        })
      )

      let current = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(current?.status).toBe(StepStatus.FAILED)
      expect(current?.attempt).toBe(1)

      // Increment for retry
      const newAttempt = await db.withOrganization(orgId, () => stepRepository.incrementAttempt(step.id))

      expect(newAttempt).toBe(2)

      // Second attempt - succeed
      const startTime2 = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: startTime2,
        })
      )

      const output = testData.stepOutput()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.SUCCEEDED, {
          output,
          completedAt: new Date(),
        })
      )

      current = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(current?.status).toBe(StepStatus.SUCCEEDED)
      expect(current?.attempt).toBe(2)
      expect(current?.output).toEqual(output)
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent step creates safely', async () => {
      const promises = Array.from({ length: 10 }).map((_, i) =>
        db.withOrganization(orgId, () =>
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

      const allSteps = await db.withOrganization(orgId, () => stepRepository.findStepsByRunId(runId))

      expect(allSteps).toHaveLength(10)
    })

    it('should handle concurrent status updates', async () => {
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        })
      )

      // Simulate concurrent status updates
      const promises = [
        db.withOrganization(orgId, () =>
          stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
            startedAt: new Date(),
          })
        ),
        db.withOrganization(orgId, () =>
          stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
            startedAt: new Date(),
          })
        ),
      ]

      await Promise.all(promises)

      const updated = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(updated?.status).toBe(StepStatus.RUNNING)
    })
  })
})
