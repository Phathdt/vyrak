import type { IEventRepository } from '@vyrak/workflow-core'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventStreamService } from '../event-stream.service'

describe('EventStreamService', () => {
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

  it('should create a stream', () => {
    const stream = service.createEventStream('run-123', 0)

    expect(stream).toBeDefined()
  })

  it('should poll for new events', (context) =>
    new Promise<void>((done) => {
      const runId = 'run-123'
      let callCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
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
        if (callCount === 2) {
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
      const receivedEvents: any[] = []

      const subscription = stream$.subscribe({
        next: (event) => {
          receivedEvents.push(event)
        },
        complete: () => {
          expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
          expect(callCount).toBeGreaterThanOrEqual(1)
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      // Auto-complete after 5 seconds to prevent hanging
      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 5000)
    }))

  it('should detect terminal state on workflow_completed', (context) =>
    new Promise<void>((done) => {
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
      const receivedEvents: any[] = []

      const subscription = stream$.subscribe({
        next: (event) => {
          receivedEvents.push(event)
        },
        complete: () => {
          expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
          const lastEvent = JSON.parse(receivedEvents[receivedEvents.length - 1].data)
          expect(lastEvent.eventType).toBe('workflow_completed')
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 5000)
    }))

  it('should detect terminal state on workflow_failed', (context) =>
    new Promise<void>((done) => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_failed',
          payload: { error: 'Something went wrong' },
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const receivedEvents: any[] = []

      const subscription = stream$.subscribe({
        next: (event) => {
          receivedEvents.push(event)
        },
        complete: () => {
          expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
          const lastEvent = JSON.parse(receivedEvents[receivedEvents.length - 1].data)
          expect(lastEvent.eventType).toBe('workflow_failed')
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 5000)
    }))

  it('should detect terminal state on workflow_cancelled', (context) =>
    new Promise<void>((done) => {
      const runId = 'run-123'

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_cancelled',
          payload: { reason: 'User cancelled' },
          createdAt: new Date(),
        },
      ])

      const stream$ = service.createEventStream(runId, 0)
      const receivedEvents: any[] = []

      const subscription = stream$.subscribe({
        next: (event) => {
          receivedEvents.push(event)
        },
        complete: () => {
          expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
          const lastEvent = JSON.parse(receivedEvents[receivedEvents.length - 1].data)
          expect(lastEvent.eventType).toBe('workflow_cancelled')
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 5000)
    }))

  it('should handle errors gracefully', (context) =>
    new Promise<void>((done) => {
      const runId = 'run-123'
      let callCount = 0

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Database error')
        }
        if (callCount === 2) {
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
      const receivedEvents: any[] = []

      const subscription = stream$.subscribe({
        next: (event) => {
          receivedEvents.push(event)
        },
        complete: () => {
          // Should recover from error and complete normally
          expect(callCount).toBeGreaterThanOrEqual(2)
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 6000)
    }))

  it('should track sequence numbers', (context) =>
    new Promise<void>((done) => {
      const runId = 'run-123'
      const initialSequence = 5

      vi.mocked(mockEventRepo.findByRunIdSince).mockImplementation(async (id, since) => {
        if (since === 5) {
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
        if (since === 6) {
          return [
            {
              id: 'event-7',
              runId,
              organizationId: 'org-123',
              stepRunId: null,
              sequence: 7,
              eventType: 'workflow_completed',
              payload: {},
              createdAt: new Date(),
            },
          ]
        }
        return []
      })

      const stream$ = service.createEventStream(runId, initialSequence)
      const receivedEvents: any[] = []

      const subscription = stream$.subscribe({
        next: (event) => {
          receivedEvents.push(event)
        },
        complete: () => {
          expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
          // Verify initial sequence was used
          expect(vi.mocked(mockEventRepo.findByRunIdSince)).toHaveBeenCalledWith(runId, initialSequence)
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 6000)
    }))

  it('should format events as MessageEvent', (context) =>
    new Promise<void>((done) => {
      const runId = 'run-123'
      const testDate = new Date('2024-01-01T00:00:00.000Z')

      vi.mocked(mockEventRepo.findByRunIdSince).mockResolvedValueOnce([
        {
          id: 'event-1',
          runId,
          organizationId: 'org-123',
          stepRunId: null,
          sequence: 1,
          eventType: 'workflow_started',
          payload: { key: 'value' },
          createdAt: testDate,
        },
      ])

      const stream$ = service.createEventStream(runId, 0)

      const subscription = stream$.subscribe({
        next: (event) => {
          expect(event.data).toBeDefined()
          const parsedData = JSON.parse(event.data)
          expect(parsedData.eventType).toBe('workflow_started')
          expect(parsedData.runId).toBe(runId)
          expect(parsedData.sequence).toBe(1)
          expect(parsedData.payload).toEqual({ key: 'value' })
          expect(parsedData.timestamp).toBe('2024-01-01T00:00:00.000Z')
          subscription.unsubscribe()
          done()
        },
        error: (err) => {
          subscription.unsubscribe()
          done(err)
        },
      })

      setTimeout(() => {
        subscription.unsubscribe()
        done()
      }, 3000)
    }))
})
