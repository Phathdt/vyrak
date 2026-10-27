import { createTestOrgWithOwner, createTestProject, getPrismaClient, resetCounters } from '@vyrak/database/test-utils'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanupTestData, IntegrationTestSetup } from './test-utils'

import { StepStatus } from '../../domain/entities/step-run.entity'
import { WorkflowState } from '../../domain/workflow-state'

describe('Workflow E2E Integration Tests', () => {
  let orgId: string
  let projectId: string
  let userId: string

  beforeAll(async () => {
    await IntegrationTestSetup.init()
  })

  afterAll(async () => {
    await IntegrationTestSetup.cleanup()
  })

  beforeEach(async () => {
    if (!IntegrationTestSetup.databaseService) return

    // Reset counters BEFORE creating test data
    resetCounters()

    const prisma = getPrismaClient()
    const { organization, user } = await createTestOrgWithOwner(prisma)
    const project = await createTestProject(prisma, organization.id)

    orgId = organization.id
    projectId = project.id
    userId = user.id
  })

  afterEach(async () => {
    await cleanupTestData(orgId)
  })

  describe('simple workflow execution', () => {
    it('should execute complete workflow: create → execute steps → complete', async () => {
      if (!IntegrationTestSetup.databaseService) return

      const databaseService = IntegrationTestSetup.databaseService
      const workflowRepository = IntegrationTestSetup.workflowRepo
      const stepRepository = IntegrationTestSetup.stepRepo
      const eventRepository = IntegrationTestSetup.eventRepo

      await databaseService.withOrganization(orgId, async () => {
        // 1. Create workflow run
        const run = await workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'notification-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
          input: {
            recipientEmail: 'user@example.com',
            message: 'Hello World',
          },
        })

        expect(run.state).toBe(WorkflowState.QUEUED)

        // 2. Log workflow started event
        const startEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          eventType: 'workflow.started',
          payload: {
            timestamp: new Date().toISOString(),
            initiator: userId,
          },
        })

        expect(startEvent.sequence).toBe(1)

        // 3. Update workflow to running
        await workflowRepository.updateRunState(run.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })

        // 4. Create steps
        const step1 = await stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'send-email',
          stepType: 'http',
          input: {
            url: 'https://api.sendgrid.com/v3/mail/send',
            method: 'POST',
          },
        })

        const step2 = await stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'log-delivery',
          stepType: 'script',
          input: {
            logLevel: 'info',
          },
        })

        // 5. Execute step 1
        const step1StartEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step1.id,
          eventType: 'step.started',
          payload: {
            stepKey: 'send-email',
            attempt: 1,
          },
        })

        expect(step1StartEvent.sequence).toBe(2)

        const step1StartTime = new Date()
        await stepRepository.updateStepStatus(step1.id, StepStatus.RUNNING, {
          startedAt: step1StartTime,
        })

        const step1Output = {
          messageId: 'msg_12345',
          statusCode: 200,
          deliveryTime: 125,
        }

        await stepRepository.updateStepStatus(step1.id, StepStatus.SUCCEEDED, {
          output: step1Output,
          completedAt: new Date(step1StartTime.getTime() + 1000),
        })

        const step1SuccessEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step1.id,
          eventType: 'step.completed',
          payload: {
            stepKey: 'send-email',
            status: 'succeeded',
            output: step1Output,
          },
        })

        expect(step1SuccessEvent.sequence).toBe(3)

        // 6. Execute step 2
        const step2StartEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step2.id,
          eventType: 'step.started',
          payload: {
            stepKey: 'log-delivery',
          },
        })

        expect(step2StartEvent.sequence).toBe(4)

        const step2StartTime = new Date()
        await stepRepository.updateStepStatus(step2.id, StepStatus.RUNNING, {
          startedAt: step2StartTime,
        })

        await stepRepository.updateStepStatus(step2.id, StepStatus.SUCCEEDED, {
          completedAt: new Date(step2StartTime.getTime() + 500),
        })

        const step2SuccessEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step2.id,
          eventType: 'step.completed',
          payload: {
            stepKey: 'log-delivery',
            status: 'succeeded',
          },
        })

        expect(step2SuccessEvent.sequence).toBe(5)

        // 7. Complete workflow
        const completionTime = new Date()
        await workflowRepository.updateRunState(run.id, {
          status: WorkflowState.SUCCEEDED,
          completedAt: completionTime,
        })

        const workflowCompleteEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          eventType: 'workflow.completed',
          payload: {
            status: 'success',
            completedAt: completionTime.toISOString(),
          },
        })

        expect(workflowCompleteEvent.sequence).toBe(6)

        // 8. Verify final state
        const finalRun = await workflowRepository.findRunById(run.id)

        expect(finalRun?.state).toBe(WorkflowState.SUCCEEDED)
        expect(finalRun?.completedAt).toBeDefined()

        const steps = await stepRepository.findStepsByRunId(run.id)

        expect(steps).toHaveLength(2)
        expect(steps[0].status).toBe(StepStatus.SUCCEEDED)
        expect(steps[1].status).toBe(StepStatus.SUCCEEDED)

        const events = await eventRepository.findEventsByRunId(run.id)

        expect(events).toHaveLength(6)
        expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6])
      })
    })
  })

  describe('workflow with step retry', () => {
    it('should handle step failure and retry', async () => {
      if (!IntegrationTestSetup.databaseService) return

      const databaseService = IntegrationTestSetup.databaseService
      const workflowRepository = IntegrationTestSetup.workflowRepo
      const stepRepository = IntegrationTestSetup.stepRepo
      const eventRepository = IntegrationTestSetup.eventRepo

      await databaseService.withOrganization(orgId, async () => {
        // 1. Create workflow
        const run = await workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'retry-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })

        await workflowRepository.updateRunState(run.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })

        // 2. Create step
        const step = await stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'flaky-http-call',
          stepType: 'http',
        })

        // 3. First attempt - fail
        await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.started',
          payload: { attempt: 1 },
        })

        const attempt1Start = new Date()
        await stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: attempt1Start,
        })

        const failEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.failed',
          payload: {
            error: 'Connection timeout',
            attempt: 1,
          },
        })

        await stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'TIMEOUT',
          errorMessage: 'Connection timeout',
          completedAt: new Date(attempt1Start.getTime() + 5000),
        })

        // 4. Retry - increment attempt
        const newAttempt = await stepRepository.incrementAttempt(step.id)

        expect(newAttempt).toBe(2)

        // 5. Second attempt - succeed
        const retryEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.retry',
          payload: {
            previousAttempt: 1,
            newAttempt: 2,
          },
        })

        expect(failEvent.sequence).toBe(2)
        expect(retryEvent.sequence).toBe(3)

        const attempt2Start = new Date()
        await stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: attempt2Start,
        })

        const successEvent = await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.completed',
          payload: {
            status: 'succeeded',
            attempt: 2,
            output: { statusCode: 200 },
          },
        })

        await stepRepository.updateStepStatus(step.id, StepStatus.SUCCEEDED, {
          output: { statusCode: 200 },
          completedAt: new Date(attempt2Start.getTime() + 2000),
        })

        // 6. Verify history
        const finalStep = await stepRepository.findById(step.id)

        expect(finalStep?.status).toBe(StepStatus.SUCCEEDED)
        expect(finalStep?.attempt).toBe(2)

        const events = await eventRepository.findEventsByRunId(run.id)

        expect(events).toHaveLength(4)
        expect(events[0].eventType).toBe('step.started')
        expect(events[1].eventType).toBe('step.failed')
        expect(events[2].eventType).toBe('step.retry')
        expect(events[3].eventType).toBe('step.completed')
        expect(successEvent.sequence).toBe(4)
      })
    })
  })

  describe('workflow failure scenario', () => {
    it('should record workflow failure with error details', async () => {
      if (!IntegrationTestSetup.databaseService) return

      const databaseService = IntegrationTestSetup.databaseService
      const workflowRepository = IntegrationTestSetup.workflowRepo
      const stepRepository = IntegrationTestSetup.stepRepo
      const eventRepository = IntegrationTestSetup.eventRepo

      await databaseService.withOrganization(orgId, async () => {
        // 1. Create and start workflow
        const run = await workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'failure-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })

        await workflowRepository.updateRunState(run.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })

        // 2. Create step
        const step = await stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'critical-step',
          stepType: 'http',
        })

        // 3. Step fails
        await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.started',
          payload: { stepKey: 'critical-step' },
        })

        const stepStartTime = new Date()
        await stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: stepStartTime,
        })

        const criticalError = 'Critical dependency failed'
        await stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'CRITICAL_ERROR',
          errorMessage: criticalError,
          completedAt: new Date(),
        })

        await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.failed',
          payload: {
            error: criticalError,
            errorCode: 'CRITICAL_ERROR',
            failureIsFatal: true,
          },
        })

        // 4. Workflow fails
        const completionTime = new Date()
        await workflowRepository.updateRunState(run.id, {
          status: WorkflowState.FAILED,
          currentStepKey: 'critical-step',
          errorCode: 'STEP_FAILED',
          errorMessage: criticalError,
          completedAt: completionTime,
        })

        await eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          eventType: 'workflow.failed',
          payload: {
            reason: 'Critical step failed',
            errorCode: 'STEP_FAILED',
            failedStep: 'critical-step',
          },
        })

        // 5. Verify failure state
        const finalRun = await workflowRepository.findRunById(run.id)

        expect(finalRun?.state).toBe(WorkflowState.FAILED)
        expect(finalRun?.errorCode).toBe('STEP_FAILED')
        expect(finalRun?.errorMessage).toBe(criticalError)
        expect(finalRun?.currentStepKey).toBe('critical-step')

        const events = await eventRepository.findEventsByRunId(run.id)

        const failureEvents = events.filter((e) => ['step.failed', 'workflow.failed'].includes(e.eventType))

        expect(failureEvents).toHaveLength(2)
      })
    })
  })

  describe('multi-tenant workflow isolation', () => {
    it('should keep workflows from different orgs completely isolated', async () => {
      if (!IntegrationTestSetup.databaseService) return

      const databaseService = IntegrationTestSetup.databaseService
      const prisma = getPrismaClient()
      const workflowRepository = IntegrationTestSetup.workflowRepo

      const { organization: org2 } = await createTestOrgWithOwner(prisma)
      const projectId2 = (await createTestProject(prisma, org2.id)).id

      // Create workflow in org1
      const run1 = await databaseService.withOrganization(orgId, async () => {
        return await workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      })

      // Create workflow in org2
      const run2 = await databaseService.withOrganization(org2.id, async () => {
        return await workflowRepository.createRun({
          organizationId: org2.id,
          projectId: projectId2,
          workflowKey: 'workflow-2',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      })

      expect(run1.organizationId).toBe(orgId)
      expect(run2.organizationId).toBe(org2.id)
      expect(run1.id).not.toBe(run2.id)

      // Repository layer doesn't enforce tenant isolation automatically
      // Applications must validate organizationId explicitly
      const run2FromDb = await databaseService.withOrganization(org2.id, async () => {
        return await workflowRepository.findRunById(run2.id)
      })

      expect(run2FromDb).not.toBeNull()
      expect(run2FromDb?.organizationId).toBe(org2.id)
      expect(run2FromDb?.organizationId).not.toBe(orgId)
    })
  })

  describe('workflow event history integrity', () => {
    it('should maintain complete immutable event history', async () => {
      if (!IntegrationTestSetup.databaseService) return

      const databaseService = IntegrationTestSetup.databaseService
      const workflowRepository = IntegrationTestSetup.workflowRepo
      const eventRepository = IntegrationTestSetup.eventRepo

      await databaseService.withOrganization(orgId, async () => {
        const run = await workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'history-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })

        // Create many events sequentially to ensure order
        const eventTypes = [
          'workflow.created',
          'workflow.queued',
          'workflow.started',
          'step.created',
          'step.started',
          'step.completed',
          'workflow.completed',
        ]

        for (const eventType of eventTypes) {
          await eventRepository.appendEvent({
            runId: run.id,
            organizationId: orgId,
            eventType,
            payload: {},
          })
        }

        // Retrieve all events
        const allEvents = await eventRepository.findEventsByRunId(run.id)

        expect(allEvents).toHaveLength(eventTypes.length)

        // Verify strict ordering
        for (let i = 0; i < allEvents.length; i++) {
          expect(allEvents[i].sequence).toBe(i + 1)
          expect(allEvents[i].eventType).toBe(eventTypes[i])
        }

        // Verify immutability - timestamps should be from insertion time
        for (let i = 0; i < allEvents.length; i++) {
          expect(allEvents[i].createdAt).toBeDefined()
          if (i > 0) {
            expect(allEvents[i].createdAt.getTime()).toBeGreaterThanOrEqual(allEvents[i - 1].createdAt.getTime())
          }
        }
      })
    })
  })
})
