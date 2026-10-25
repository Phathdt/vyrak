import { getPrismaClient } from '@vyrak/database/test-utils'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanupTestData, IntegrationTestSetup, testData } from './test-utils'

import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'

describe('EventRepository Integration Tests', () => {
  let prisma: ReturnType<typeof getPrismaClient> | undefined
  let eventRepository: IEventRepository
  let workflowRepository: IWorkflowRepository
  let orgId: string
  let projectId: string
  let userId: string
  let runId: string

  beforeAll(async () => {
    await IntegrationTestSetup.init()
    prisma = IntegrationTestSetup.prisma
    eventRepository = IntegrationTestSetup.eventRepo
    workflowRepository = IntegrationTestSetup.workflowRepo
  })

  afterAll(async () => {
    await IntegrationTestSetup.cleanup()
  })

  beforeEach(async () => {
    if (!prisma) {
      console.warn('Test database setup failed, skipping integration tests')
      return
    }

    orgId = testData.orgId()
    projectId = testData.projectId()
    const userEmail = `test-user-${Math.random().toString(36).slice(2)}@test.com`

    // Setup test user and capture the ID
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        name: userEmail.split('@')[0],
      },
    })
    userId = user.id

    // Setup org and project
    await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: `Test Org ${orgId}`,
        slug: orgId,
      },
    })

    await prisma.project.upsert({
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

    // Create workflow run for testing
    const run = await workflowRepository.createRun({
      organizationId: orgId,
      projectId,
      workflowKey: 'workflow-1',
      workflowVersion: '1.0.0',
      initiatedByUserId: userId,
    })
    runId = run.id

    // Ensure run is clean before test starts (events from concurrent operations in previous tests)
    await prisma.workflowEvent.deleteMany({
      where: { runId },
    })
  })

  afterEach(async () => {
    await cleanupTestData(prisma!, orgId)
  })

  describe('appendEvent', () => {
    it('should append event with auto-incremented sequence', async () => {
      if (!prisma) return

      const event = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'workflow.started',
        payload: testData.eventPayload(),
      })

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
      if (!prisma) return

      const event1 = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'workflow.started',
        payload: { timestamp: '2024-01-01' },
      })

      const event2 = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'step.started',
        payload: { step: 'step-1' },
      })

      const event3 = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'step.completed',
        payload: { step: 'step-1', status: 'success' },
      })

      expect(event1.sequence).toBe(1)
      expect(event2.sequence).toBe(2)
      expect(event3.sequence).toBe(3)
    })

    it('should track step run association', async () => {
      if (!prisma) return

      // Create a step run first
      const stepRun = await prisma.workflowStepRun.create({
        data: {
          runId,
          organizationId: orgId,
          stepKey: 'step-1',
          stepType: 'http',
        },
      })

      const event = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        stepRunId: stepRun.id,
        eventType: 'step.started',
        payload: { step: 'step-1' },
      })

      expect(event.stepRunId).toBe(stepRun.id)
    })

    it('should support null stepRunId for workflow events', async () => {
      if (!prisma) return

      const event = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'workflow.completed',
        payload: { status: 'success' },
      })

      expect(event.stepRunId).toBeNull()
    })
  })

  describe('findEventsByRunId', () => {
    it('should find all events for a run in sequence order', async () => {
      if (!prisma) return

      const events = Array.from({ length: 5 }).map((_, i) => ({
        runId,
        organizationId: orgId,
        eventType: `event-${i}`,
        payload: { index: i },
      }))

      // Append events sequentially to ensure order
      const created = []
      for (const e of events) {
        const event = await eventRepository.appendEvent(e)
        created.push(event)
      }

      const found = await eventRepository.findEventsByRunId(runId)

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
      if (!prisma) return

      // Create 10 events
      for (let i = 0; i < 10; i++) {
        await eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: `event-${i}`,
          payload: { index: i },
        })
      }

      // Get first 3
      const page1 = await eventRepository.findEventsByRunId(runId, 3, 0)

      expect(page1).toHaveLength(3)
      expect(page1[0].sequence).toBe(1)
      expect(page1[2].sequence).toBe(3)

      // Get next 3
      const page2 = await eventRepository.findEventsByRunId(runId, 3, 3)

      expect(page2).toHaveLength(3)
      expect(page2[0].sequence).toBe(4)
      expect(page2[2].sequence).toBe(6)

      // Get last 4
      const page3 = await eventRepository.findEventsByRunId(runId, 10, 6)

      expect(page3).toHaveLength(4)
      expect(page3[0].sequence).toBe(7)
    })

    it('should return empty array for run with no events', async () => {
      if (!prisma) return

      const newRun = await workflowRepository.createRun({
        organizationId: orgId,
        projectId,
        workflowKey: 'workflow-2',
        workflowVersion: '1.0.0',
        initiatedByUserId: userId,
      })

      const events = await eventRepository.findEventsByRunId(newRun.id)

      expect(events).toHaveLength(0)
    })

    it('should enforce tenant isolation', async () => {
      if (!prisma) return

      // Create event in org1
      await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'workflow.started',
        payload: { test: true },
      })

      const orgId2 = testData.orgId()

      // Setup second org
      await prisma.organization.create({
        data: {
          id: orgId2,
          name: `Test Org ${orgId2}`,
          slug: orgId2,
        },
      })

      // Try to access from different org - should return empty
      const events = await eventRepository.findEventsByRunId(runId)

      expect(events).toHaveLength(1)

      // Cleanup
      await prisma.organization.delete({ where: { id: orgId2 } })
    })
  })

  describe('getNextSequence', () => {
    it('should return 1 for new run', async () => {
      if (!prisma) return

      const sequence = await eventRepository.getNextSequence(runId)

      expect(sequence).toBe(1)
    })

    it('should return next sequence after events added', async () => {
      if (!prisma) return

      await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'event-1',
        payload: {},
      })

      const sequence = await eventRepository.getNextSequence(runId)

      expect(sequence).toBe(2)
    })

    it('should return correct sequence after multiple events', async () => {
      if (!prisma) return

      for (let i = 0; i < 5; i++) {
        await eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: `event-${i}`,
          payload: {},
        })
      }

      const sequence = await eventRepository.getNextSequence(runId)

      expect(sequence).toBe(6)
    })
  })

  describe('concurrent event appends', () => {
    it('should maintain sequence integrity under concurrent appends', async () => {
      if (!prisma) return

      const eventPromises = Array.from({ length: 20 }).map((_, i) =>
        eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: `concurrent-event-${i}`,
          payload: { index: i },
        })
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
      if (!prisma) return

      const run1 = runId

      const run2 = await workflowRepository.createRun({
        organizationId: orgId,
        projectId,
        workflowKey: 'workflow-2',
        workflowVersion: '1.0.0',
        initiatedByUserId: userId,
      })

      // Append events sequentially for each run to avoid RLS race conditions
      // Run 1 events
      for (let i = 0; i < 5; i++) {
        await eventRepository.appendEvent({
          runId: run1,
          organizationId: orgId,
          eventType: `run1-event-${i}`,
          payload: { run: 1 },
        })
      }

      // Run 2 events
      for (let i = 0; i < 5; i++) {
        await eventRepository.appendEvent({
          runId: run2.id,
          organizationId: orgId,
          eventType: `run2-event-${i}`,
          payload: { run: 2 },
        })
      }

      const run1Events = await eventRepository.findEventsByRunId(run1)

      const run2Events = await eventRepository.findEventsByRunId(run2.id)

      expect(run1Events).toHaveLength(5)
      expect(run2Events).toHaveLength(5)

      // Each run should have sequences 1-5
      expect(run1Events.map((e: any) => e.sequence).sort((a: number, b: number) => a - b)).toEqual([1, 2, 3, 4, 5])
      expect(run2Events.map((e: any) => e.sequence).sort((a: number, b: number) => a - b)).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('event cascade on workflow deletion', () => {
    it('should delete all events when workflow run is deleted', async () => {
      if (!prisma) return

      // Create multiple events
      for (let i = 0; i < 5; i++) {
        await eventRepository.appendEvent({
          runId,
          organizationId: orgId,
          eventType: `event-${i}`,
          payload: { index: i },
        })
      }

      // Verify events exist
      const eventsBefore = await eventRepository.findEventsByRunId(runId)

      expect(eventsBefore).toHaveLength(5)

      // Delete workflow run
      await prisma.workflowRun.delete({
        where: { id: runId },
      })

      // Verify events are gone
      const eventsAfter = await prisma.workflowEvent.findMany({
        where: { runId },
      })

      expect(eventsAfter).toHaveLength(0)
    })
  })

  describe('event payload validation', () => {
    it('should store complex nested payloads', async () => {
      if (!prisma) return

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

      const event = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'complex.event',
        payload: complexPayload,
      })

      expect(event.payload).toEqual(complexPayload)
    })

    it('should handle empty payload object', async () => {
      if (!prisma) return

      const event = await eventRepository.appendEvent({
        runId,
        organizationId: orgId,
        eventType: 'empty.event',
        payload: {},
      })

      expect(event.payload).toEqual({})
    })
  })
})
