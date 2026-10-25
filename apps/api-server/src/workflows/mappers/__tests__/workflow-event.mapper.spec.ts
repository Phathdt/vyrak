import { describe, expect, it } from 'vitest'

import { toWorkflowEventResponseDto } from '../workflow-event.mapper'

describe('toWorkflowEventResponseDto', () => {
  it('should map event with normal payload', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'workflow_started',
      payload: {
        workflowKey: 'ai-sdlc-workflow',
        version: '1.0.0',
        userId: 'user-123',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'workflow_started',
      payload: {
        workflowKey: 'ai-sdlc-workflow',
        version: '1.0.0',
        userId: 'user-123',
      },
      sequence: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
    })
  })

  it('should redact password field', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'credentials_provided',
      payload: {
        username: 'admin',
        password: 'secret123',
        email: 'admin@example.com',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.password).toBe('[REDACTED]')
    expect(result.payload.username).toBe('admin')
    expect(result.payload.email).toBe('admin@example.com')
  })

  it('should redact token field', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'api_call',
      payload: {
        url: 'https://api.example.com',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        method: 'POST',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.token).toBe('[REDACTED]')
    expect(result.payload.url).toBe('https://api.example.com')
    expect(result.payload.method).toBe('POST')
  })

  it('should redact secret field', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'config_loaded',
      payload: {
        appName: 'myapp',
        secret: 'super-secret-value',
        region: 'us-west-2',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.secret).toBe('[REDACTED]')
    expect(result.payload.appName).toBe('myapp')
    expect(result.payload.region).toBe('us-west-2')
  })

  it('should redact apiKey field', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'external_service_call',
      payload: {
        service: 'openai',
        apiKey: 'sk-1234567890abcdef',
        model: 'gpt-4',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.apiKey).toBe('[REDACTED]')
    expect(result.payload.service).toBe('openai')
    expect(result.payload.model).toBe('gpt-4')
  })

  it('should redact nested sensitive data', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'config_update',
      payload: {
        application: {
          name: 'myapp',
          credentials: {
            username: 'admin',
            password: 'secret',
            apiToken: 'token123',
          },
          region: 'us-west-2',
        },
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.application.name).toBe('myapp')
    expect(result.payload.application.region).toBe('us-west-2')
    expect(result.payload.application.credentials.username).toBe('admin')
    expect(result.payload.application.credentials.password).toBe('[REDACTED]')
    expect(result.payload.application.credentials.apiToken).toBe('[REDACTED]')
  })

  it('should preserve non-sensitive data', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'step_completed',
      payload: {
        stepKey: 'plan',
        status: 'succeeded',
        duration: 5000,
        output: {
          planId: 'plan-123',
          approved: true,
        },
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload).toEqual({
      stepKey: 'plan',
      status: 'succeeded',
      duration: 5000,
      output: {
        planId: 'plan-123',
        approved: true,
      },
    })
  })

  it('should convert Date to ISO string', () => {
    const date = new Date('2024-06-15T10:30:45.123Z')
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'test_event',
      payload: {},
      createdAt: date,
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.createdAt).toBe('2024-06-15T10:30:45.123Z')
  })

  it('should handle empty payload', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'workflow_started',
      payload: {},
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload).toEqual({})
  })

  it('should redact case-insensitive sensitive keys', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'mixed_case_test',
      payload: {
        Password: 'secret1',
        API_TOKEN: 'secret2',
        AccessToken: 'secret3',
        RefreshToken: 'secret4',
        normalField: 'public',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.Password).toBe('[REDACTED]')
    expect(result.payload.API_TOKEN).toBe('[REDACTED]')
    expect(result.payload.AccessToken).toBe('[REDACTED]')
    expect(result.payload.RefreshToken).toBe('[REDACTED]')
    expect(result.payload.normalField).toBe('public')
  })

  it('should not redact arrays', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'array_test',
      payload: {
        items: [1, 2, 3],
        tags: ['important', 'password_protected'],
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.items).toEqual([1, 2, 3])
    expect(result.payload.tags).toEqual(['important', 'password_protected'])
  })

  it('should redact multiple sensitive fields in same payload', () => {
    const event = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepRunId: null,
      sequence: 1,
      eventType: 'multiple_secrets',
      payload: {
        username: 'admin',
        password: 'pass123',
        apiKey: 'key123',
        secret: 'secret123',
        token: 'token123',
        publicField: 'visible',
      },
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toWorkflowEventResponseDto(event)

    expect(result.payload.username).toBe('admin')
    expect(result.payload.password).toBe('[REDACTED]')
    expect(result.payload.apiKey).toBe('[REDACTED]')
    expect(result.payload.secret).toBe('[REDACTED]')
    expect(result.payload.token).toBe('[REDACTED]')
    expect(result.payload.publicField).toBe('visible')
  })
})
