import { Test, TestingModule } from '@nestjs/testing'
import { DatabaseService } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EventPrismaRepository } from './event-prisma.repository'

describe('EventPrismaRepository', () => {
  let repository: EventPrismaRepository
  let db: DatabaseService

  const mockPrismaEvent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    runId: '550e8400-e29b-41d4-a716-446655440001',
    organizationId: '550e8400-e29b-41d4-a716-446655440002',
    stepRunId: null,
    sequence: 1,
    eventType: 'run_created',
    payload: { workflowKey: 'deploy', workflowVersion: '1.0.0' },
    createdAt: new Date('2026-10-25T10:00:00Z'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPrismaRepository,
        {
          provide: DatabaseService,
          useValue: {
            client: {
              $transaction: vi.fn(),
              workflowEvent: {
                findFirst: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
              },
            },
          },
        },
      ],
    }).compile()

    repository = module.get<EventPrismaRepository>(EventPrismaRepository)
    db = module.get<DatabaseService>(DatabaseService)
  })

  describe('appendEvent', () => {
    it('should append event with atomic sequence generation', async () => {
      const event = {
        runId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        eventType: 'step_completed',
        payload: { stepKey: 'deploy', durationMs: 12500 },
      }

      const mockResult = {
        ...mockPrismaEvent,
        eventType: 'step_completed',
        payload: event.payload,
        sequence: 1,
      }

      vi.spyOn(db.client, '$transaction').mockImplementation(async (callback: any) => {
        return await callback({
          workflowEvent: {
            findFirst: vi.fn().mockResolvedValueOnce(null),
            create: vi.fn().mockResolvedValueOnce(mockResult),
          },
        })
      })

      const result = await repository.appendEvent(event)

      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.sequence).toBe(1)
      expect(result.eventType).toBe('step_completed')
    })

    it('should increment sequence for subsequent events', async () => {
      const event = {
        runId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        stepRunId: '550e8400-e29b-41d4-a716-446655440010',
        eventType: 'step_failed',
        payload: { stepKey: 'deploy', errorCode: 'TIMEOUT' },
      }

      const mockResult = {
        ...mockPrismaEvent,
        stepRunId: '550e8400-e29b-41d4-a716-446655440010',
        eventType: 'step_failed',
        payload: event.payload,
        sequence: 5,
      }

      vi.spyOn(db.client, '$transaction').mockImplementation(async (callback: any) => {
        return await callback({
          workflowEvent: {
            findFirst: vi.fn().mockResolvedValueOnce({ sequence: 4 }),
            create: vi.fn().mockResolvedValueOnce(mockResult),
          },
        })
      })

      const result = await repository.appendEvent(event)

      expect(result.sequence).toBe(5)
    })
  })

  describe('findEventsByRunId', () => {
    it('should find events ordered by sequence with pagination', async () => {
      const mockEvents = [
        {
          ...mockPrismaEvent,
          id: '550e8400-e29b-41d4-a716-446655440010',
          sequence: 1,
          eventType: 'run_created',
        },
        {
          ...mockPrismaEvent,
          id: '550e8400-e29b-41d4-a716-446655440011',
          sequence: 2,
          eventType: 'step_completed',
        },
      ]

      vi.spyOn(db.client.workflowEvent, 'findMany').mockResolvedValueOnce(mockEvents)

      const result = await repository.findEventsByRunId('550e8400-e29b-41d4-a716-446655440001', 10, 0)

      expect(result).toHaveLength(2)
      expect(result[0].sequence).toBe(1)
      expect(result[1].sequence).toBe(2)
      expect(db.client.workflowEvent.findMany).toHaveBeenCalledWith({
        where: { runId: '550e8400-e29b-41d4-a716-446655440001' },
        orderBy: { sequence: 'asc' },
        take: 10,
        skip: 0,
      })
    })

    it('should use default pagination values', async () => {
      vi.spyOn(db.client.workflowEvent, 'findMany').mockResolvedValueOnce([])

      await repository.findEventsByRunId('550e8400-e29b-41d4-a716-446655440001')

      expect(db.client.workflowEvent.findMany).toHaveBeenCalledWith({
        where: { runId: '550e8400-e29b-41d4-a716-446655440001' },
        orderBy: { sequence: 'asc' },
        take: 100,
        skip: 0,
      })
    })
  })

  describe('getNextSequence', () => {
    it('should return next sequence number', async () => {
      vi.spyOn(db.client.workflowEvent, 'findFirst').mockResolvedValueOnce({ sequence: 5 })

      const result = await repository.getNextSequence('550e8400-e29b-41d4-a716-446655440001')

      expect(result).toBe(6)
      expect(db.client.workflowEvent.findFirst).toHaveBeenCalledWith({
        where: { runId: '550e8400-e29b-41d4-a716-446655440001' },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      })
    })

    it('should return 1 if no events exist', async () => {
      vi.spyOn(db.client.workflowEvent, 'findFirst').mockResolvedValueOnce(null)

      const result = await repository.getNextSequence('550e8400-e29b-41d4-a716-446655440001')

      expect(result).toBe(1)
    })
  })
})
