import { describe, expect, it } from 'vitest'

import { ArtifactContentSchema, ArtifactMetadataSchema } from '../'

describe('ArtifactMetadataDto', () => {
  it('should validate a valid artifact metadata', () => {
    const validDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      type: 'plan',
      name: 'implementation-plan.md',
      size: 1024,
      contentType: 'text/markdown',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = ArtifactMetadataSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })

  it('should accept null stepKey', () => {
    const dtoWithNullStepKey = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: null,
      type: 'other',
      name: 'artifact.txt',
      size: 512,
      contentType: 'text/plain',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = ArtifactMetadataSchema.safeParse(dtoWithNullStepKey)
    expect(result.success).toBe(true)
  })

  it('should accept all valid artifact types', () => {
    const types = ['plan', 'implementation_report', 'test_result', 'approval_plan', 'other']

    types.forEach((type) => {
      const dto = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '123e4567-e89b-12d3-a456-426614174001',
        stepKey: null,
        type,
        name: 'artifact.txt',
        size: 100,
        contentType: 'text/plain',
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      const result = ArtifactMetadataSchema.safeParse(dto)
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid artifact type', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: null,
      type: 'invalid_type',
      name: 'artifact.txt',
      size: 100,
      contentType: 'text/plain',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = ArtifactMetadataSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUID for id', () => {
    const invalidDto = {
      id: 'not-a-uuid',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: null,
      type: 'plan',
      name: 'artifact.txt',
      size: 100,
      contentType: 'text/plain',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = ArtifactMetadataSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject negative size', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: null,
      type: 'plan',
      name: 'artifact.txt',
      size: -1,
      contentType: 'text/plain',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = ArtifactMetadataSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should accept size of 0', () => {
    const dtoWithZeroSize = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: null,
      type: 'plan',
      name: 'empty.txt',
      size: 0,
      contentType: 'text/plain',
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    const result = ArtifactMetadataSchema.safeParse(dtoWithZeroSize)
    expect(result.success).toBe(true)
  })

  it('should require all fields', () => {
    const incompleteDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      // Missing required fields
    }

    const result = ArtifactMetadataSchema.safeParse(incompleteDto)
    expect(result.success).toBe(false)
  })
})

describe('ArtifactContentDto', () => {
  it('should validate artifact with string content', () => {
    const validDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'plan.md',
      contentType: 'text/markdown',
      content: '# Implementation Plan\n\nThis is the plan content.',
      size: 1024,
    }

    const result = ArtifactContentSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })

  it('should validate artifact with object content', () => {
    const validDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'config.json',
      contentType: 'application/json',
      content: {
        version: '1.0.0',
        settings: {
          enabled: true,
          timeout: 5000,
        },
      },
      size: 256,
    }

    const result = ArtifactContentSchema.safeParse(validDto)
    expect(result.success).toBe(true)
  })

  it('should accept empty string content', () => {
    const dtoWithEmptyString = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'empty.txt',
      contentType: 'text/plain',
      content: '',
      size: 0,
    }

    const result = ArtifactContentSchema.safeParse(dtoWithEmptyString)
    expect(result.success).toBe(true)
  })

  it('should accept empty object content', () => {
    const dtoWithEmptyObject = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'data.json',
      contentType: 'application/json',
      content: {},
      size: 2,
    }

    const result = ArtifactContentSchema.safeParse(dtoWithEmptyObject)
    expect(result.success).toBe(true)
  })

  it('should accept nested object content', () => {
    const dtoWithNestedContent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'complex.json',
      contentType: 'application/json',
      content: {
        metadata: {
          author: 'AI Agent',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        data: {
          items: [1, 2, 3],
          config: {
            enabled: true,
          },
        },
      },
      size: 512,
    }

    const result = ArtifactContentSchema.safeParse(dtoWithNestedContent)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const invalidDto = {
      id: 'not-a-uuid',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'plan.md',
      contentType: 'text/markdown',
      content: 'Content',
      size: 100,
    }

    const result = ArtifactContentSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should reject negative size', () => {
    const invalidDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'plan.md',
      contentType: 'text/markdown',
      content: 'Content',
      size: -1,
    }

    const result = ArtifactContentSchema.safeParse(invalidDto)
    expect(result.success).toBe(false)
  })

  it('should require all fields', () => {
    const incompleteDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'plan.md',
      // Missing required fields
    }

    const result = ArtifactContentSchema.safeParse(incompleteDto)
    expect(result.success).toBe(false)
  })

  it('should handle large string content', () => {
    const largeContent = 'A'.repeat(1000000) // 1MB of 'A' characters

    const dtoWithLargeContent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      name: 'large.txt',
      contentType: 'text/plain',
      content: largeContent,
      size: 1000000,
    }

    const result = ArtifactContentSchema.safeParse(dtoWithLargeContent)
    expect(result.success).toBe(true)
  })
})
