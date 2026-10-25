import type { DatabaseService } from '@vyrak/database'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanupTestData, IntegrationTestSetup, testData } from './test-utils'

import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'
import { EVENT_REPOSITORY, WORKFLOW_REPOSITORY } from '../../infras/di/di'

describe('EventRepository Integration Tests', () => {
  let db: DatabaseService
  let eventRepository: IEventRepository
  let workflowRepository: IWorkflowRepository
  let orgId: string
  let projectId: string
  let userId: string
  let runId: string

  beforeAll(async () => {
    await IntegrationTestSetup.init()
    db = IntegrationTestSetup.db
    eventRepository = IntegrationTestSetup.get<IEventRepository>(EVENT_REPOSITORY)
    workflowRepository = IntegrationTestSetup.get<IWorkflowRepository>(WORKFLOW_REPOSITORY)
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

    // Ensure run is clean before test starts (events from concurrent operations in previous tests)
    await db.withSystemAccess(async () => {
      await db.client.workflowEvent.deleteMany({
        where: { runId },
      })
    })
  })

  afterEach(async () => {
    await cleanupTestData(db, orgId)
  })

  describe('appendEvent', () => {
    it('should append event with auto-incremented sequence', async () => {
      const event = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'workflow.started',
          payload: testData.eventPayload(),
        })
      )

      expect(event).toBeDefined()
      expect(event.id).toBeDefined()
      expect(event.runId).toBe(runId)
      expect(event.organizationId).toBe(orgId)
      expect(event.sequence).toBe(1)
      expect(event.eventType).toBe('workflow.started')
      expect(event.payload).toBeDefined()
      expect(event.createdAt).toBeInstanceOf(Date)
    })

    it('should increment sequence for multiple events in same run', async () => {
      const event1 = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'workflow.started',
          payload: { timestamp: '2024-01-01' },
        })
      )

      const event2 = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'step.started',
          payload: { step: 'step-1' },
        })
      )

      const event3 = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'step.completed',
          payload: { step: 'step-1', status: 'success' },
        })
      )

      expect(event1.sequence).toBe(1)
      expect(event2.sequence).toBe(2)
      expect(event3.sequence).toBe(3)
    })

    it('should track step run association', async () => {
      // Create a step run first
      const stepRun = await db.withSystemAccess(async () =>
        db.client.workflowStepRun.create({
          data: {
            runId,
            organizationId: orgId,
            stepKey: 'step-1',
            stepType: 'http',
          },
        })
      )

      const event = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          stepRunId: stepRun.id,
          eventType: 'step.started',
          payload: { step: 'step-1' },
        })
      )

      expect(event.stepRunId).toBe(stepRun.id)
    })

    it('should support null stepRunId for workflow events', async () => {
      const event = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'workflow.completed',
          payload: { status: 'success' },
        })
      )

      expect(event.stepRunId).toBeNull()
    })
  })

  describe('findEventsByRunId', () => {
    it('should find all events for a run in sequence order', async () => {
      const events = Array.from({ length: 5 }).map((_, i) => ({
        runId,
        organizationId: orgId,
        eventType: `event-${i}`,
        payload: { index: i },
      }))

      const created = await Promise.all(
        events.map((e) => db.withOrganization(orgId, () => eventRepository.appendEvent(e)))
      )

      const found = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(runId))

      expect(found).toHaveLength(5)
      expect(found[0].sequence).toBe(1)
      expect(found[1].sequence).toBe(2)
      expect(found[2].sequence).toBe(3)
      expect(found[3].sequence).toBe(4)
      expect(found[4].sequence).toBe(5)

      // Verify order matches creation
      for (let i = 0; i < found.length; i++) {
        expect(found[i].id).toBe(created[i].id)
      }
    })

    it('should support pagination with limit and offset', async () => {
      // Create 10 events
      for (let i = 0; i < 10; i++) {
        await db.withOrganization(orgId, () =>
          eventRepository.appendEvent({
            runId,
            organizationId: orgId,
            eventType: `event-${i}`,
            payload: { index: i },
          })
        )
      }

      // Get first 3
      const page1 = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(runId, 3, 0))

      expect(page1).toHaveLength(3)
      expect(page1[0].sequence).toBe(1)
      expect(page1[2].sequence).toBe(3)

      // Get next 3
      const page2 = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(runId, 3, 3))

      expect(page2).toHaveLength(3)
      expect(page2[0].sequence).toBe(4)
      expect(page2[2].sequence).toBe(6)

      // Get last 4
      const page3 = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(runId, 10, 6))

      expect(page3).toHaveLength(4)
      expect(page3[0].sequence).toBe(7)
    })

    it('should return empty array for run with no events', async () => {
      const newRun = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-2',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      const events = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(newRun.id))

      expect(events).toHaveLength(0)
    })

    it('should enforce tenant isolation', async () => {
      // Create event in org1
      await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'workflow.started',
          payload: { test: true },
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
      const events = await db.withOrganization(orgId2, () => eventRepository.findEventsByRunId(runId))

      expect(events).toHaveLength(0)

      // Cleanup
      await db.withSystemAccess(async () => {
        await db.client.organization.delete({ where: { id: orgId2 } })
      })
    })
  })

  describe('getNextSequence', () => {
    it('should return 1 for new run', async () => {
      const sequence = await db.withOrganization(orgId, () => eventRepository.getNextSequence(runId))

      expect(sequence).toBe(1)
    })

    it('should return next sequence after events added', async () => {
      await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'event-1',
          payload: {},
        })
      )

      const sequence = await db.withOrganization(orgId, () => eventRepository.getNextSequence(runId))

      expect(sequence).toBe(2)
    })

    it('should return correct sequence after multiple events', async () => {
      for (let i = 0; i < 5; i++) {
        await db.withOrganization(orgId, () =>
          eventRepository.appendEvent({
            runId,
            organizationId: orgId,
            eventType: `event-${i}`,
            payload: {},
          })
        )
      }

      const sequence = await db.withOrganization(orgId, () => eventRepository.getNextSequence(runId))

      expect(sequence).toBe(6)
    })
  })

  describe('concurrent event appends', () => {
    it('should maintain sequence integrity under concurrent appends', async () => {
      const eventPromises = Array.from({ length: 20 }).map((_, i) =>
        db.withOrganization(orgId, () =>
          eventRepository.appendEvent({
            runId,
            organizationId: orgId,
            eventType: `concurrent-event-${i}`,
            payload: { index: i },
          })
        )
      )

      const events = await Promise.all(eventPromises)

      // All events should have unique sequences
      const sequences = events.map((e: any) => e.sequence).sort((a: number, b: number) => a - b)
      const uniqueSequences = new Set(sequences)

      expect(uniqueSequences.size).toBe(20)
      expect(sequences[0]).toBe(1)
      expect(sequences[19]).toBe(20)

      // Verify no gaps in sequence
      for (let i = 0; i < 20; i++) {
        expect(sequences[i]).toBe(i + 1)
      }
    })

    it('should handle concurrent appends from different test runs independently', async () => {
      const run1 = runId

      const run2 = await db.withOrganization(orgId, () =>
        workflowRepository.createRun({
          organizationId: orgId,
          projectId,
          workflowKey: 'workflow-2',
          workflowVersion: '1.0.0',
          initiatedByUserId: userId,
        })
      )

      // Append events concurrently to both runs
      const promises = [
        ...Array.from({ length: 5 }).map((_, i) =>
          db.withOrganization(orgId, () =>
            eventRepository.appendEvent({
              runId: run1,
              organizationId: orgId,
              eventType: `run1-event-${i}`,
              payload: { run: 1 },
            })
          )
        ),
        ...Array.from({ length: 5 }).map((_, i) =>
          db.withOrganization(orgId, () =>
            eventRepository.appendEvent({
              runId: run2.id,
              organizationId: orgId,
              eventType: `run2-event-${i}`,
              payload: { run: 2 },
            })
          )
        ),
      ]

      await Promise.all(promises)

      const run1Events = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(run1))

      const run2Events = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(run2.id))

      expect(run1Events).toHaveLength(5)
      expect(run2Events).toHaveLength(5)

      // Each run should have sequences 1-5
      expect(run1Events.map((e: any) => e.sequence).sort((a: number, b: number) => a - b)).toEqual([1, 2, 3, 4, 5])
      expect(run2Events.map((e: any) => e.sequence).sort((a: number, b: number) => a - b)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('event cascade on workflow deletion', () => {
    it('should delete all events when workflow run is deleted', async () => {
      // Create multiple events
      for (let i = 0; i < 5; i++) {
        await db.withOrganization(orgId, () =>
          eventRepository.appendEvent({
            runId,
            organizationId: orgId,
            eventType: `event-${i}`,
            payload: { index: i },
          })
        )
      }

      // Verify events exist
      const eventsBefore = await db.withOrganization(orgId, () => eventRepository.findEventsByRunId(runId))

      expect(eventsBefore).toHaveLength(5)

      // Delete workflow run
      await db.withSystemAccess(async () => {
        await db.client.workflowRun.delete({
          where: { id: runId },
        })
      })

      // Verify events are gone
      const eventsAfter = await db.withSystemAccess(async () =>
        db.client.workflowEvent.findMany({
          where: { runId },
        })
      )

      expect(eventsAfter).toHaveLength(0)
    })
  })

  describe('event payload validation', () => {
    it('should store complex nested payloads', async () => {
      const complexPayload = {
        metadata: {
          source: 'system',
          priority: 'high',
          tags: ['urgent', 'production'],
        },
        data: {
          nested: {
            deep: {
              value: 'test',
              count: 42,
            },
          },
        },
        timestamps: [new Date().toISOString(), new Date().toISOString()],
      }

      const event = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'complex.event',
          payload: complexPayload,
        })
      )

      expect(event.payload).toEqual(complexPayload)
    })

    it('should handle empty payload object', async () => {
      const event = await db.withOrganization(orgId, () =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: 'empty.event',
          payload: {},
        })
      )

      expect(event.payload).toEqual({})
    })
  })
})
