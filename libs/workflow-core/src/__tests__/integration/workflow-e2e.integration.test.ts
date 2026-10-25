import type { DatabaseService } from '@vyrak/database'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanupTestData, IntegrationTestSetup, testData } from './test-utils'

import { StepStatus } from '../../domain/entities/step-run.entity'
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IStepRepository } from '../../domain/interfaces/step-repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'
import { WorkflowState } from '../../domain/workflow-state'
import { EVENT_REPOSITORY, STEP_REPOSITORY, WORKFLOW_REPOSITORY } from '../../infras/di/di'

describe('Workflow E2E Integration Tests', () => {
  let db: DatabaseService
  let workflowRepository: IWorkflowRepository
  let stepRepository: IStepRepository
  let eventRepository: IEventRepository
  let orgId: string
  let projectId: string
  let userId: string

  beforeAll(async () => {
    await IntegrationTestSetup.init()
    db = IntegrationTestSetup.db
    workflowRepository = IntegrationTestSetup.get<IWorkflowRepository>(WORKFLOW_REPOSITORY)
    stepRepository = IntegrationTestSetup.get<IStepRepository>(STEP_REPOSITORY)
    eventRepository = IntegrationTestSetup.get<IEventRepository>(EVENT_REPOSITORY)
  })

  afterAll(async () => {
    await IntegrationTestSetup.cleanup()
  })

  beforeEach(async () => {
    orgId = testData.orgId()
    projectId = testData.projectId()
    const userEmail = `test-user-${Math.random().toString(36).slice(2)}@test.com`

    // Setup test user and capture the ID
    await db.withSystemAccess(async () => {
      const user = await db.client.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
          email: userEmail,
          name: userEmail.split('@')[0],
        },
      })
      userId = user.id
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
  })

  afterEach(async () => {
    await cleanupTestData(db, orgId)
  })

  describe('simple workflow execution', () => {
    it('should execute complete workflow: create → execute steps → complete', async () => {
      // 1. Create workflow run
      const run = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
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
      )

      expect(run.state).toBe(WorkflowState.QUEUED)

      // 2. Log workflow started event
      const startEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          eventType: 'workflow.started',
          payload: {
            timestamp: new Date().toISOString(),
            initiator: userId,
          },
        })
      )

      expect(startEvent.sequence).toBe(1)

      // 3. Update workflow to running
      await db.withOrganization(orgId, () =>
        workflowRepository.updateRunState(run.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })
      )

      // 4. Create steps
      const step1 = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'send-email',
          stepType: 'http',
          input: {
            url: 'https://api.sendgrid.com/v3/mail/send',
            method: 'POST',
          },
        })
      )

      const step2 = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'log-delivery',
          stepType: 'script',
          input: {
            logLevel: 'info',
          },
        })
      )

      // 5. Execute step 1
      const step1StartEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step1.id,
          eventType: 'step.started',
          payload: {
            stepKey: 'send-email',
            attempt: 1,
          },
        })
      )

      expect(step1StartEvent.sequence).toBe(2)

      const step1StartTime = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step1.id, StepStatus.RUNNING, {
          startedAt: step1StartTime,
        })
      )

      const step1Output = {
        messageId: 'msg_12345',
        statusCode: 200,
        deliveryTime: 125,
      }

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step1.id, StepStatus.SUCCEEDED, {
          output: step1Output,
          completedAt: new Date(step1StartTime.getTime() + 1000),
        })
      )

      const step1SuccessEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
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
      )

      expect(step1SuccessEvent.sequence).toBe(3)

      // 6. Execute step 2
      const step2StartEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step2.id,
          eventType: 'step.started',
          payload: {
            stepKey: 'log-delivery',
          },
        })
      )

      expect(step2StartEvent.sequence).toBe(4)

      const step2StartTime = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step2.id, StepStatus.RUNNING, {
          startedAt: step2StartTime,
        })
      )

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step2.id, StepStatus.SUCCEEDED, {
          completedAt: new Date(step2StartTime.getTime() + 500),
        })
      )

      const step2SuccessEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step2.id,
          eventType: 'step.completed',
          payload: {
            stepKey: 'log-delivery',
            status: 'succeeded',
          },
        })
      )

      expect(step2SuccessEvent.sequence).toBe(5)

      // 7. Complete workflow
      const completionTime = new Date()
      await db.withOrganization(orgId, () =>
        workflowRepository.updateRunState(run.id, {
          status: WorkflowState.SUCCEEDED,
          completedAt: completionTime,
        })
      )

      const workflowCompleteEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          eventType: 'workflow.completed',
          payload: {
            status: 'success',
            completedAt: completionTime.toISOString(),
          },
        })
      )

      expect(workflowCompleteEvent.sequence).toBe(6)

      // 8. Verify final state
      const finalRun = await db.withOrganization(orgId, () => workflowRepository.findRunById(run.id))

      expect(finalRun?.state).toBe(WorkflowState.SUCCEEDED)
      expect(finalRun?.completedAt).toBeDefined()

      const steps = await db.withOrganization(orgId, () => stepRepository.findStepsByRunId(run.id))

      expect(steps).toHaveLength(2)
      expect(steps[0].status).toBe(StepStatus.SUCCEEDED)
      expect(steps[1].status).toBe(StepStatus.SUCCEEDED)

      const events = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(run.id))

      expect(events).toHaveLength(6)
      expect(events.map((e) => e.sequence)).toEqual([1, 2, 3, 4, 5, 6])
    })
  })

  describe('workflow with step retry', () => {
    it('should handle step failure and retry', async () => {
      // 1. Create workflow
      const run = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'retry-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      await db.withOrganization(orgId, () =>
        workflowRepository.updateRunState(run.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })
      )

      // 2. Create step
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'flaky-http-call',
          stepType: 'http',
        })
      )

      // 3. First attempt - fail
      await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.started',
          payload: { attempt: 1 },
        })
      )

      const attempt1Start = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: attempt1Start,
        })
      )

      const failEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.failed',
          payload: {
            error: 'Connection timeout',
            attempt: 1,
          },
        })
      )

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'TIMEOUT',
          errorMessage: 'Connection timeout',
          completedAt: new Date(attempt1Start.getTime() + 5000),
        })
      )

      // 4. Retry - increment attempt
      const newAttempt = await db.withOrganization(orgId, () => stepRepository.incrementAttempt(step.id))

      expect(newAttempt).toBe(2)

      // 5. Second attempt - succeed
      const retryEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.retry',
          payload: {
            previousAttempt: 1,
            newAttempt: 2,
          },
        })
      )

      expect(failEvent.sequence).toBe(2)
      expect(retryEvent.sequence).toBe(3)

      const attempt2Start = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: attempt2Start,
        })
      )

      const successEvent = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
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
      )

      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.SUCCEEDED, {
          output: { statusCode: 200 },
          completedAt: new Date(attempt2Start.getTime() + 2000),
        })
      )

      // 6. Verify history
      const finalStep = await db.withOrganization(orgId, () => stepRepository.findById(step.id))

      expect(finalStep?.status).toBe(StepStatus.SUCCEEDED)
      expect(finalStep?.attempt).toBe(2)

      const events = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(run.id))

      expect(events).toHaveLength(5)
      expect(events[1].eventType).toBe('step.failed')
      expect(events[2].eventType).toBe('step.retry')
      expect(events[3].eventType).toBe('step.completed')
      expect(successEvent.sequence).toBe(4)
    })
  })

  describe('workflow failure scenario', () => {
    it('should record workflow failure with error details', async () => {
      // 1. Create and start workflow
      const run = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'failure-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      await db.withOrganization(orgId, () =>
        workflowRepository.updateRunState(run.id, {
          status: WorkflowState.RUNNING,
          startedAt: new Date(),
        })
      )

      // 2. Create step
      const step = await db.withOrganization(orgId, () =>
        stepRepository.createStepRun({
          runId: run.id,
          organizationId: orgId,
          stepKey: 'critical-step',
          stepType: 'http',
        })
      )

      // 3. Step fails
      await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          stepRunId: step.id,
          eventType: 'step.started',
          payload: { stepKey: 'critical-step' },
        })
      )

      const stepStartTime = new Date()
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.RUNNING, {
          startedAt: stepStartTime,
        })
      )

      const criticalError = 'Critical dependency failed'
      await db.withOrganization(orgId, () =>
        stepRepository.updateStepStatus(step.id, StepStatus.FAILED, {
          errorCode: 'CRITICAL_ERROR',
          errorMessage: criticalError,
          completedAt: new Date(),
        })
      )

      await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
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
      )

      // 4. Workflow fails
      const completionTime = new Date()
      await db.withOrganization(orgId, () =>
        workflowRepository.updateRunState(run.id, {
          status: WorkflowState.FAILED,
          currentStepKey: 'critical-step',
          errorCode: 'STEP_FAILED',
          errorMessage: criticalError,
          completedAt: completionTime,
        })
      )

      await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId: run.id,
          organizationId: orgId,
          eventType: 'workflow.failed',
          payload: {
            reason: 'Critical step failed',
            errorCode: 'STEP_FAILED',
            failedStep: 'critical-step',
          },
        })
      )

      // 5. Verify failure state
      const finalRun = await db.withOrganization(orgId, () => workflowRepository.findRunById(run.id))

      expect(finalRun?.state).toBe(WorkflowState.FAILED)
      expect(finalRun?.errorCode).toBe('STEP_FAILED')
      expect(finalRun?.errorMessage).toBe(criticalError)
      expect(finalRun?.currentStepKey).toBe('critical-step')

      const events = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(run.id))

      const failureEvents = events.filter((e) => ['step.failed', 'workflow.failed'].includes(e.eventType))

      expect(failureEvents).toHaveLength(2)
    })
  })

  describe('multi-tenant workflow isolation', () => {
    it('should keep workflows from different orgs completely isolated', async () => {
      const orgId2 = testData.orgId()
      const projectId2 = testData.projectId()

      // Setup second org
      await db.withSystemAccess(async () => {
        await db.client.organization.create({
          data: {
            id: orgId2,
            name: `Test Org ${orgId2}`,
            slug: orgId2,
          },
        })

        await db.client.project.create({
          data: {
            id: projectId2,
            organizationId: orgId2,
            name: 'Test Project 2',
            slug: projectId2,
          },
        })
      })

      // Create workflow in org1
      const run1 = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-1',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      // Create workflow in org2
      const run2 = await db.withOrganization(orgId2, () =>
        workflowRepository.createRun({
          organizationId: orgId2,
          projectId: projectId2,
          workflowKey: 'workflow-2',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      expect(run1.organizationId).toBe(orgId)
      expect(run2.organizationId).toBe(orgId2)
      expect(run1.id).not.toBe(run2.id)

      // Try to access org2 run from org1 context
      const wrongOrgAccess = await db.withOrganization(orgId, () => workflowRepository.findRunById(run2.id))

      expect(wrongOrgAccess).toBeNull()

      // Cleanup
      await db.withSystemAccess(async () => {
        await db.client.workflowRun.deleteMany({ where: { organizationId: orgId2 } })
        await db.client.project.deleteMany({ where: { organizationId: orgId2 } })
        await db.client.organization.delete({ where: { id: orgId2 } })
      })
    })
  })

  describe('workflow event history integrity', () => {
    it('should maintain complete immutable event history', async () => {
      const run = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'history-workflow',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      // Create many events
      const eventTypes = [
        'workflow.created',
        'workflow.queued',
        'workflow.started',
        'step.created',
        'step.started',
        'step.completed',
        'workflow.completed',
      ]

      await Promise.all(
        eventTypes.map((eventType, i) =>
          db.withOrganization(orgId, () =>
            eventRepository.appendEvent({
              runId: run.id,
              organizationId: orgId,
              eventType,
              payload: { sequence: i + 1 },
            })
          )
        )
      )

      // Retrieve all events
      const allEvents = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(run.id))

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
