import { describe, expect, it } from 'vitest'

import { StepRunResponseSchema } from '../step-run-response.dto'

describe('StepRunResponseDto', () => {
  it('should validate a valid step run response', () => {
    const validDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: 1,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID for id', () => {
    const invalidDto = {
      id: 'not-a-uuid',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: 1,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUID for runId', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: 'invalid-uuid',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: 1,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject invalid status enum', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'invalid-status',
      attempt: 1,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should accept all valid status values', () => {
    const statuses = ['pending', 'running', 'succeeded', 'failed', 'skipped']

    statuses.forEach((status) => {
      const dto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '123e4567-e89b-12d3-a456-426614174001',
        stepKey: 'plan',
        status,
        attempt: 1,
        startedAt: null,
        completedAt: null,
        errorMessage: null,
        outputArtifactId: null,
      }

      const result = StepRunResponseSchema.safeParse(dto)
      expect(result.success).toBe(true)
    })
  })

  it('should require all fields', () => {
    const incompleteDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      // Missing status, attempt, etc.
    }

    const result = StepRunResponseSchema.safeParse(incompleteDto)
    expect(result.success).toBe(false)
  })

  it('should accept null for nullable fields', () => {
    const dtoWithNulls = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'pending',
      attempt: 1,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(dtoWithNulls)
    expect(result.success).toBe(true)
  })

  it('should accept valid datetime strings for timestamps', () => {
    const dtoWithTimestamps = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: 1,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(dtoWithTimestamps)
    expect(result.success).toBe(true)
  })

  it('should accept error message string', () => {
    const dtoWithError = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'failed',
      attempt: 2,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      errorMessage: 'Step execution failed',
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(dtoWithError)
    expect(result.success).toBe(true)
  })

  it('should accept outputArtifactId UUID', () => {
    const dtoWithArtifact = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: 1,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      errorMessage: null,
      outputArtifactId: '123e4567-e89b-12d3-a456-426614174002',
    }

    const result = StepRunResponseSchema.safeParse(dtoWithArtifact)
    expect(result.success).toBe(true)
  })

  it('should reject negative attempt number', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: -1,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      outputArtifactId: null,
    }

    const result = StepRunResponseSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })
})
