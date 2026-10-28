import type { ArtifactEntity } from '@vyrak/agent-runtime'

import { describe, expect, it } from 'vitest'

import { toArtifactContentDto, toArtifactMetadataDto } from '../artifact.mapper'

// Helper to infer content type from file path
function inferContentType(filePath: string): string {
  if (filePath.endsWith('.json')) {
    return 'application/json'
  }
  if (filePath.endsWith('.md')) {
    return 'text/markdown'
  }
  if (filePath.endsWith('.txt')) {
    return 'text/plain'
  }
  return 'text/plain'
}

// Helper to create test artifact with S3 fields
function createTestArtifact(filePath: string, content: string): ArtifactEntity {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    organizationId: '123e4567-e89b-12d3-a456-426614174001',
    runId: '123e4567-e89b-12d3-a456-426614174002',
    filePath,
    s3Bucket: 'test-bucket',
    s3Key: `artifacts/test/${filePath}`,
    contentSize: Buffer.byteLength(content, 'utf8'),
    contentType: inferContentType(filePath),
    content,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }
}

describe('toArtifactMetadataDto', () => {
  it('should map artifact to metadata DTO', () => {
    const artifact = createTestArtifact('plans/implementation-plan.md', '# Implementation Plan\n\nThis is the plan.')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(result.runId).toBe('123e4567-e89b-12d3-a456-426614174002')
    expect(result.stepKey).toBeNull()
    expect(result.type).toBe('plan')
    expect(result.name).toBe('implementation-plan.md')
    expect(result.contentType).toBe('text/markdown')
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('should infer plan type from filename', () => {
    const artifact = createTestArtifact('plans/phase-01-plan.md', 'Plan content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.type).toBe('plan')
  })

  it('should infer implementation_report type from filename', () => {
    const artifact = createTestArtifact('reports/implementation-report.md', 'Report content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.type).toBe('implementation_report')
  })

  it('should infer test_result type from filename', () => {
    const artifact = createTestArtifact('results/test-results.json', '{}')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.type).toBe('test_result')
  })

  it('should infer approval_plan type from filename with both keywords', () => {
    const artifact = createTestArtifact('plans/approval-plan.md', 'Approval plan content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.type).toBe('approval_plan')
  })

  it('should infer other type for unknown filenames', () => {
    const artifact = createTestArtifact('misc/config.yaml', 'config: true')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.type).toBe('other')
  })

  it('should infer content type for markdown files', () => {
    const artifact = createTestArtifact('docs/readme.md', '# README')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.contentType).toBe('text/markdown')
  })

  it('should infer content type for JSON files', () => {
    const artifact = createTestArtifact('data/config.json', '{"key": "value"}')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.contentType).toBe('application/json')
  })

  it('should infer content type for text files', () => {
    const artifact = createTestArtifact('logs/output.txt', 'log content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.contentType).toBe('text/plain')
  })

  it('should default to text/plain for unknown extensions', () => {
    const artifact = createTestArtifact('data/file.xyz', 'content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.contentType).toBe('text/plain')
  })

  it('should calculate size for string content', () => {
    const content = 'Hello, World!'
    const artifact = createTestArtifact('test.txt', content)

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.size).toBe(Buffer.byteLength(content, 'utf8'))
  })

  it('should handle stepKey as null', () => {
    const artifact = createTestArtifact('artifact.txt', 'content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.stepKey).toBeNull()
  })

  it('should extract name from file path', () => {
    const artifact = createTestArtifact('deeply/nested/path/to/file.md', 'content')

    const result = toArtifactMetadataDto(artifact, artifact.runId)

    expect(result.name).toBe('file.md')
  })
})

describe('toArtifactContentDto', () => {
  it('should map artifact to content DTO with string content', () => {
    const artifact = createTestArtifact('plan.md', '# Plan\n\nThis is the plan content.')

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(result.runId).toBe('123e4567-e89b-12d3-a456-426614174002')
    expect(result.name).toBe('plan.md')
    expect(result.contentType).toBe('text/markdown')
    expect(result.content).toBe('# Plan\n\nThis is the plan content.')
    expect(typeof result.content).toBe('string')
  })

  it('should map artifact to content DTO with JSON content', () => {
    const jsonContent = '{"status": "success", "data": {"id": "123"}}'
    const artifact = createTestArtifact('results/output.json', jsonContent)

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(result.contentType).toBe('application/json')
    expect(typeof result.content).toBe('object')
    expect(result.content).toEqual({
      status: 'success',
      data: { id: '123' },
    })
  })

  it('should keep invalid JSON as string', () => {
    const invalidJson = '{"incomplete": '
    const artifact = createTestArtifact('data/invalid.json', invalidJson)

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(typeof result.content).toBe('string')
    expect(result.content).toBe(invalidJson)
  })

  it('should calculate size for string content', () => {
    const content = 'Test content'
    const artifact = createTestArtifact('test.txt', content)

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(result.size).toBe(Buffer.byteLength(content, 'utf8'))
  })

  it('should handle empty string content', () => {
    const artifact = createTestArtifact('empty.txt', '')

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(result.content).toBe('')
    expect(result.size).toBe(0)
  })

  it('should handle multi-byte UTF-8 characters', () => {
    const content = 'Hello 世界 🌍'
    const artifact = createTestArtifact('unicode.txt', content)

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(result.content).toBe(content)
    expect(result.size).toBe(Buffer.byteLength(content, 'utf8'))
    expect(result.size).toBeGreaterThan(content.length) // UTF-8 is multi-byte
  })

  it('should parse JSON with nested objects', () => {
    const jsonContent = JSON.stringify({
      metadata: {
        author: 'AI',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
      data: {
        items: [1, 2, 3],
      },
    })

    const artifact = createTestArtifact('complex.json', jsonContent)

    const result = toArtifactContentDto(artifact, artifact.runId)

    expect(typeof result.content).toBe('object')
    expect(result.content).toEqual({
      metadata: {
        author: 'AI',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
      data: {
        items: [1, 2, 3],
      },
    })
  })
})
