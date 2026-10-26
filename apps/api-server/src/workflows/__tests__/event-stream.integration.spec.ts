import type { IEventRepository } from '@vyrak/workflow-core'

import { firstValueFrom, take, takeUntil, timer, timeout, toArray } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventStreamService } from '../services/event-stream.service'

describe('EventStreamService Integration Tests', () => {
  let service: EventStreamService
  let mockEventRepo: IEventRepository

  beforeEach(() => {
    mockEventRepo = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
      getNextSequence: vi.fn(),
      countByRunId: vi.fn(),
      findByRunIdSince: vi.fn(),
    }

    service = new EventStreamService(mockEventRepo)
  })

  describe('Stream New Events', () => {
    it('should deliver events in correct order when multiple events available', async () => {
      const runId = 'run-123'
      let pollCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async (id, since) => {
        pollCount++

        // First poll: return 2 events
        if (pollCount === 1 && since === 0) {
          return [
            {
              id: 'event-1',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 1,
              eventType: 'workflow_started',
              payload: { initiator: 'user' },
              createdAt: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
              id: 'event-2',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 2,
              eventType: 'step_started',
              payload: { stepName: 'step-1' },
              createdAt: new Date('2024-01-01T00:00:01.000Z'),
            },
          ]
        }

        // Second poll: return terminal event
        if (pollCount === 2 && since === 2) {
          return [
            {
              id: 'event-3',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 3,
              eventType: 'workflow_completed',
              payload: { status: 'success' },
              createdAt: new Date('2024-01-01T00:00:02.000Z'),
            },
          ]
        }

        return []
      })

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(4), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(3)
      expect(JSON.parse(events[0].data).sequence).toBe(1)
      expect(JSON.parse(events[1].data).sequence).toBe(2)
      expect(JSON.parse(events[2].data).sequence).toBe(3)
      expect(JSON.parse(events[0].data).eventType).toBe('workflow_started')
      expect(JSON.parse(events[1].data).eventType).toBe('step_started')
      expect(JSON.parse(events[2].data).eventType).toBe('workflow_completed')
    })

    it('should deliver events with correct MessageEvent format', async () => {
      const runId = 'run-123'
      const testDate = new Date('2024-01-01T12:30:45.123Z')

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: 'step-456',
          sequence: 1,
          eventType: 'step_completed',
          payload: { output: 'test data', duration: 5000 },
          createdAt: testDate,
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const event = await firstValueFrom(stream$.pipe(take(1), timeout(10000)))

      expect(event).toBeDefined()
      expect(event.data).toBeDefined()
      expect(typeof event.data).toBe('string')

      const parsedData = JSON.parse(event.data)
      expect(parsedData).toEqual({
        eventType: 'step_completed',
        runId,
        sequence: 1,
        payload: { output: 'test data', duration: 5000 },
        timestamp: testDate.toISOString(),
      })
    })

    it('should batch multiple events from single poll and emit separately', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'event_type_a',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 2,
          eventType: 'event_type_b',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'event-3',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 3,
          eventType: 'event_type_c',
          payload: {},
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(3), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(3)
      expect(JSON.parse(events[0].data).eventType).toBe('event_type_a')
      expect(JSON.parse(events[1].data).eventType).toBe('event_type_b')
      expect(JSON.parse(events[2].data).eventType).toBe('event_type_c')
    })
  })

  describe('Terminal State Closes Stream', () => {
    it('should complete stream when workflow_completed event is received', async () => {
      const runId = 'run-123'
      let completed = false

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_started',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 2,
          eventType: 'workflow_completed',
          payload: { result: 'success' },
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)

      const events = await new Promise<any[]>((resolve, reject) => {
        const receivedEvents: any[] = []
        const subscription = stream$.pipe(timeout(10000)).subscribe({
          next: (event) => {
            receivedEvents.push(event)
          },
          complete: () => {
            completed = true
            resolve(receivedEvents)
          },
          error: reject,
        })

        setTimeout(() => {
          subscription.unsubscribe()
          reject(new Error('Stream did not complete within timeout'))
        }, 8000)
      })

      expect(completed).toBe(true)
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(JSON.parse(events[events.length - 1].data).eventType).toBe(
        'workflow_completed'
      )
    })

    it('should complete stream when workflow_failed event is received', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'step_failed',
          payload: { error: 'Step execution failed' },
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 2,
          eventType: 'workflow_failed',
          payload: { reason: 'A step failed' },
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(2), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(2)
      expect(JSON.parse(events[1].data).eventType).toBe('workflow_failed')
    })

    it('should complete stream when workflow_cancelled event is received', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_started',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 2,
          eventType: 'workflow_cancelled',
          payload: { cancelledBy: 'user-456' },
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(2), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(2)
      expect(JSON.parse(events[1].data).eventType).toBe('workflow_cancelled')
    })

    it('should deliver all events before closing on terminal state', async () => {
      const runId = 'run-123'
      let pollCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async (id, since) => {
        pollCount++

        // First poll: return 3 regular events
        if (pollCount === 1 && since === 0) {
          return [
            {
              id: 'event-1',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 1,
              eventType: 'workflow_started',
              payload: {},
              createdAt: new Date(),
            },
            {
              id: 'event-2',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 2,
              eventType: 'step_started',
              payload: {},
              createdAt: new Date(),
            },
            {
              id: 'event-3',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 3,
              eventType: 'step_completed',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        // Second poll: return terminal event
        if (pollCount === 2 && since === 3) {
          return [
            {
              id: 'event-4',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 4,
              eventType: 'workflow_completed',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        return []
      })

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(5), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(4)
      expect(JSON.parse(events[0].data).sequence).toBe(1)
      expect(JSON.parse(events[1].data).sequence).toBe(2)
      expect(JSON.parse(events[2].data).sequence).toBe(3)
      expect(JSON.parse(events[3].data).sequence).toBe(4)
      expect(JSON.parse(events[3].data).eventType).toBe('workflow_completed')
    })
  })

  describe('Error Handling', () => {
    it('should continue streaming after database error on first poll', async () => {
      const runId = 'run-123'
      let pollCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async () => {
        pollCount++

        // First poll: throw error
        if (pollCount === 1) {
          throw new Error('Database connection failed')
        }

        // Second poll: return event successfully
        if (pollCount === 2) {
          return [
            {
              id: 'event-1',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 1,
              eventType: 'workflow_completed',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        return []
      })

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(1), toArray(), timeout(10000))
      )

      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(pollCount).toBeGreaterThanOrEqual(2)
    })

    it('should recover from intermittent errors and resume normal operation', async () => {
      const runId = 'run-123'
      let pollCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async (id, since) => {
        pollCount++

        // First poll: error
        if (pollCount === 1) {
          throw new Error('Temporary error')
        }

        // Second poll: error
        if (pollCount === 2) {
          throw new Error('Another temporary error')
        }

        // Third poll: success
        if (pollCount === 3) {
          return [
            {
              id: 'event-1',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 1,
              eventType: 'workflow_started',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        // Fourth poll: terminal event
        if (pollCount === 4) {
          return [
            {
              id: 'event-2',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 2,
              eventType: 'workflow_completed',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        return []
      })

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(3), toArray(), timeout(10000))
      )

      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(pollCount).toBeGreaterThanOrEqual(3)
    })

    it('should not throw or leak resources on database error', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockRejectedValueOnce(
        new Error('Connection pool exhausted')
      )

      const stream$ = service.createEventStream(runId, 0)
      let errorThrown = false

      const events: any[] = []
      await new Promise<void>((resolve) => {
        const subscription = stream$.pipe(timeout(5000)).subscribe({
          next: (event) => {
            events.push(event)
          },
          error: () => {
            errorThrown = true
            resolve()
          },
          complete: () => {
            resolve()
          },
        })

        setTimeout(() => {
          subscription.unsubscribe()
          resolve()
        }, 4000)
      })

      // Stream should not throw, should continue polling
      expect(errorThrown).toBe(false)
    })
  })

  describe('Resume From Sequence', () => {
    it('should start streaming from specified since sequence', async () => {
      const runId = 'run-123'
      const capturedArgs: any[] = []

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(
        async (id, since) => {
          capturedArgs.push({ id, since })

          // Only respond to correct since value
          if (since === 10) {
            return [
              {
                id: 'event-11',
                runId,
                organizationId: 'org-123',
                stepRunId: null,
                sequence: 11,
                eventType: 'step_started',
                payload: {},
                createdAt: new Date(),
              },
              {
                id: 'event-12',
                runId,
                organizationId: 'org-123',
                stepRunId: null,
                sequence: 12,
                eventType: 'workflow_completed',
                payload: {},
                createdAt: new Date(),
              },
            ]
          }

          return []
        }
      )

      const stream$ = service.createEventStream(runId, 10)
      const events = await firstValueFrom(
        stream$.pipe(take(2), toArray(), timeout(10000))
      )

      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(capturedArgs[0].since).toBe(10)
      expect(JSON.parse(events[0].data).sequence).toBe(11)
    })

    it('should track and update sequence across multiple polls', async () => {
      const runId = 'run-123'
      let pollCount = 0
      const capturedArgs: any[] = []

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(
        async (id, since) => {
          pollCount++
          capturedArgs.push({ pollNumber: pollCount, since })

          if (pollCount === 1 && since === 5) {
            return [
              {
                id: 'event-6',
                runId,
                organizationId: 'org-123',
                stepRunId: null,
                sequence: 6,
                eventType: 'step_started',
                payload: {},
                createdAt: new Date(),
              },
            ]
          }

          if (pollCount === 2 && since === 6) {
            return [
              {
                id: 'event-7',
                runId,
                organizationId: 'org-123',
                stepRunId: null,
                sequence: 7,
                eventType: 'step_completed',
                payload: {},
                createdAt: new Date(),
              },
            ]
          }

          if (pollCount === 3 && since === 7) {
            return [
              {
                id: 'event-8',
                runId,
                organizationId: 'org-123',
                stepRunId: null,
                sequence: 8,
                eventType: 'workflow_completed',
                payload: {},
                createdAt: new Date(),
              },
            ]
          }

          return []
        }
      )

      const stream$ = service.createEventStream(runId, 5)
      const events = await firstValueFrom(
        stream$.pipe(take(3), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(3)
      expect(JSON.parse(events[0].data).sequence).toBe(6)
      expect(JSON.parse(events[1].data).sequence).toBe(7)
      expect(JSON.parse(events[2].data).sequence).toBe(8)

      // Verify sequence progression in calls
      expect(capturedArgs[0].since).toBe(5)
      expect(capturedArgs[1].since).toBe(6)
      expect(capturedArgs[2].since).toBe(7)
    })

    it('should not re-emit events when resuming from last sequence', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(
        async (id, since) => {
          // Only return new events (after the since sequence)
          if (since === 100) {
            return [
              {
                id: 'event-101',
                runId,
                organizationId: 'org-123',
                stepRunId: null,
                sequence: 101,
                eventType: 'step_started',
                payload: {},
                createdAt: new Date(),
              },
            ]
          }

          // Don't return events <= since
          return []
        }
      )

      const stream$ = service.createEventStream(runId, 100)
      const events = await firstValueFrom(
        stream$.pipe(take(1), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(1)
      expect(JSON.parse(events[0].data).sequence).toBeGreaterThan(100)
    })
  })

  describe('Multiple Events Handling', () => {
    it('should maintain sequence ordering when multiple events in one poll', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_started',
          payload: {},
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 2,
          eventType: 'step_1_started',
          payload: {},
          createdAt: new Date('2024-01-01T00:00:01.000Z'),
        },
        {
          id: 'event-3',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 3,
          eventType: 'step_1_completed',
          payload: {},
          createdAt: new Date('2024-01-01T00:00:02.000Z'),
        },
        {
          id: 'event-4',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 4,
          eventType: 'step_2_started',
          payload: {},
          createdAt: new Date('2024-01-01T00:00:03.000Z'),
        },
        {
          id: 'event-5',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 5,
          eventType: 'workflow_completed',
          payload: {},
          createdAt: new Date('2024-01-01T00:00:04.000Z'),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(5), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(5)
      const sequences = events.map((e) => JSON.parse(e.data).sequence)
      const eventTypes = events.map((e) => JSON.parse(e.data).eventType)

      expect(sequences).toEqual([1, 2, 3, 4, 5])
      expect(eventTypes).toEqual([
        'workflow_started',
        'step_1_started',
        'step_1_completed',
        'step_2_started',
        'workflow_completed',
      ])
    })

    it('should preserve event payload data across all events', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: 'step-456',
          sequence: 1,
          eventType: 'step_started',
          payload: {
            stepId: 'step-456',
            stepName: 'validate_input',
            input: { userId: '789', action: 'create' },
          },
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: 'step-456',
          sequence: 2,
          eventType: 'step_completed',
          payload: {
            stepId: 'step-456',
            stepName: 'validate_input',
            output: { isValid: true, errors: [] },
            duration: 150,
          },
          createdAt: new Date('2024-01-01T00:00:01.000Z'),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(2), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(2)

      const event1 = JSON.parse(events[0].data)
      expect(event1.payload).toEqual({
        stepId: 'step-456',
        stepName: 'validate_input',
        input: { userId: '789', action: 'create' },
      })

      const event2 = JSON.parse(events[1].data)
      expect(event2.payload).toEqual({
        stepId: 'step-456',
        stepName: 'validate_input',
        output: { isValid: true, errors: [] },
        duration: 150,
      })
    })
  })

  describe('Stream Subscription Lifecycle', () => {
    it('should support multiple independent subscriptions to same stream', async () => {
      const runId = 'run-123'
      let pollCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async () => {
        pollCount++

        if (pollCount === 1) {
          return [
            {
              id: 'event-1',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 1,
              eventType: 'workflow_started',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        if (pollCount === 2) {
          return [
            {
              id: 'event-2',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 2,
              eventType: 'workflow_completed',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }

        return []
      })

      const stream$ = service.createEventStream(runId, 0)

      // Collect events from first subscription
      const promise1 = firstValueFrom(
        stream$.pipe(take(1), toArray(), timeout(10000))
      )

      // Wait a bit, then subscribe second time
      await new Promise((resolve) => setTimeout(resolve, 500))

      const promise2 = firstValueFrom(
        stream$.pipe(take(1), toArray(), timeout(10000))
      )

      const [events1, events2] = await Promise.all([promise1, promise2])

      expect(events1.length).toBeGreaterThanOrEqual(1)
      expect(events2.length).toBeGreaterThanOrEqual(1)
    })

    it('should properly cleanup resources after stream completion', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_completed',
          payload: {},
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      let completionCalled = false

      await new Promise<void>((resolve) => {
        const subscription = stream$.pipe(timeout(10000)).subscribe({
          next: () => {
            /* handle event */
          },
          complete: () => {
            completionCalled = true
            resolve()
          },
        })

        setTimeout(() => {
          subscription.unsubscribe()
          resolve()
        }, 5000)
      })

      expect(completionCalled).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty event array from repository', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([])

      const stream$ = service.createEventStream(runId, 0)

      const events: any[] = []
      await new Promise<void>((resolve) => {
        const subscription = stream$.pipe(timeout(3000)).subscribe({
          next: (event) => {
            events.push(event)
          },
          error: () => {
            resolve()
          },
        })

        setTimeout(() => {
          subscription.unsubscribe()
          resolve()
        }, 2500)
      })

      expect(events).toHaveLength(0)
    })

    it('should handle very large payload data', async () => {
      const runId = 'run-123'
      const largePayload = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          data: 'x'.repeat(1000),
        })),
      }

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'step_completed',
          payload: largePayload,
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 2,
          eventType: 'workflow_completed',
          payload: {},
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(2), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(2)
      const firstEvent = JSON.parse(events[0].data)
      expect(firstEvent.payload).toEqual(largePayload)
    })

    it('should handle null stepRunId gracefully', async () => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_started',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          runId,
          organizationId: 'org-123',
          stepRunId: 'step-123',
          sequence: 2,
          eventType: 'step_started',
          payload: {},
          createdAt: new Date(),
        },
        {
          id: 'event-3',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 3,
          eventType: 'workflow_completed',
          payload: {},
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const events = await firstValueFrom(
        stream$.pipe(take(3), toArray(), timeout(10000))
      )

      expect(events).toHaveLength(3)
      // All events should be properly formatted regardless of stepRunId value
      expect(JSON.parse(events[0].data).runId).toBe(runId)
      expect(JSON.parse(events[1].data).runId).toBe(runId)
      expect(JSON.parse(events[2].data).runId).toBe(runId)
    })
  })
})
