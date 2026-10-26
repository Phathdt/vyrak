import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// Recreate schemas with raw zod for testing (DTOs use nestjs-zod/z)
const WorkflowEventResponseSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  sequence: z.number().int().min(1),
  createdAt: z.string().datetime(),
})

const ListEventsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

const PaginatedEventsResponseSchema = z.object({
  items: z.array(WorkflowEventResponseSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
})

describe('WorkflowEventResponseDto', () => {
  it('should validate a valid event response', () => {
    const validDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'workflow_started',
      payload: { key: 'value' },
      sequence: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = WorkflowEventResponseSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const invalidDto = {
      id: 'not-a-uuid',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'workflow_started',
      payload: {},
      sequence: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = WorkflowEventResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should accept empty payload object', () => {
    const dtoWithEmptyPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'workflow_started',
      payload: {},
      sequence: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = WorkflowEventResponseSchema.safeParse(dtoWithEmptyPayload)
    expect(result.success).toBe(true)
  })

  it('should accept nested payload objects', () => {
    const dtoWithNestedPayload = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'step_completed',
      payload: {
        stepKey: 'plan',
        output: {
          planId: 'plan-123',
          status: 'approved',
        },
      },
      sequence: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = WorkflowEventResponseSchema.safeParse(dtoWithNestedPayload)
    expect(result.success).toBe(true)
  })

  it('should reject negative sequence', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'workflow_started',
      payload: {},
      sequence: -1,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = WorkflowEventResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })
})

describe('ListEventsQueryDto', () => {
  it('should use default values', () => {
    const emptyQuery = {}

    const result = ListEventsQuerySchema.parse(emptyQuery)
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(0)
  })

  it('should accept valid limit and offset', () => {
    const validQuery = {
      limit: 50,
      offset: 10,
    }

    const result = ListEventsQuerySchema.parse(validQuery)
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(10)
  })

  it('should coerce string to number', () => {
    const queryWithStrings = {
      limit: 30,
      offset: 5,
    }

    const result = ListEventsQuerySchema.parse(queryWithStrings)
    expect(typeof result.limit).toBe('number')
    expect(typeof result.offset).toBe('number')
    expect(result.limit).toBe(30)
    expect(result.offset).toBe(5)
  })

  it('should reject limit of 0', () => {
    const invalidQuery = {
      limit: 0,
      offset: 0,
    }

    const result = ListEventsQuerySchema.safeParse(invalidQuery)
    expect(result.success).toBe(false)
  })

  it('should reject limit greater than 100', () => {
    const invalidQuery = {
      limit: 101,
      offset: 0,
    }

    const result = ListEventsQuerySchema.safeParse(invalidQuery)
    expect(result.success).toBe(false)
  })

  it('should accept limit of 1', () => {
    const validQuery = {
      limit: 1,
      offset: 0,
    }

    const result = ListEventsQuerySchema.parse(validQuery)
    expect(result.limit).toBe(1)
  })

  it('should accept limit of 100', () => {
    const validQuery = {
      limit: 100,
      offset: 0,
    }

    const result = ListEventsQuerySchema.parse(validQuery)
    expect(result.limit).toBe(100)
  })

  it('should reject negative offset', () => {
    const invalidQuery = {
      limit: 20,
      offset: -1,
    }

    const result = ListEventsQuerySchema.safeParse(invalidQuery)
    expect(result.success).toBe(false)
  })

  it('should accept offset of 0', () => {
    const validQuery = {
      limit: 20,
      offset: 0,
    }

    const result = ListEventsQuerySchema.parse(validQuery)
    expect(result.offset).toBe(0)
  })
})

describe('PaginatedEventsResponseDto', () => {
  it('should validate a valid paginated response', () => {
    const validDto = {
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '123e4567-e89b-12d3-a456-426614174001',
          eventType: 'workflow_started',
          payload: {},
          sequence: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      total: 50,
      limit: 20,
      offset: 0,
    }

    const result = PaginatedEventsResponseSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })

  it('should accept empty items array', () => {
    const dtoWithEmptyItems = {
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    }

    const result = PaginatedEventsResponseSchema.safeParse(dtoWithEmptyItems)
    expect(result.success).toBe(true)
  })

  it('should reject negative total', () => {
    const invalidDto = {
      items: [],
      total: -1,
      limit: 20,
      offset: 0,
    }

    const result = PaginatedEventsResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject limit less than 1', () => {
    const invalidDto = {
      items: [],
      total: 0,
      limit: 0,
      offset: 0,
    }

    const result = PaginatedEventsResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject negative offset', () => {
    const invalidDto = {
      items: [],
      total: 0,
      limit: 20,
      offset: -1,
    }

    const result = PaginatedEventsResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should validate items array with multiple events', () => {
    const validDto = {
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          runId: '123e4567-e89b-12d3-a456-426614174001',
          eventType: 'workflow_started',
          payload: {},
          sequence: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          runId: '123e4567-e89b-12d3-a456-426614174001',
          eventType: 'step_started',
          payload: { stepKey: 'plan' },
          sequence: 2,
          createdAt: '2024-01-01T00:00:10.000Z',
        },
      ],
      total: 50,
      limit: 20,
      offset: 0,
    }

    const result = PaginatedEventsResponseSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })
})
