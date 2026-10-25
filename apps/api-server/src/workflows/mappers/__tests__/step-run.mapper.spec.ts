import { StepStatus } from '@vyrak/workflow-core'
import { describe, expect, it } from 'vitest'

import { toStepRunResponseDto } from '../step-run.mapper'

describe('toStepRunResponseDto', () => {
  it('should map complete step run with all fields', () => {
    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.SUCCEEDED,
      attempt: 1,
      input: { requirement: 'Build feature X' },
      output: { planId: 'plan-123' },
      startedAt: new Date('2024-01-01T00:00:00.000Z'),
      completedAt: new Date('2024-01-01T00:05:00.000Z'),
      errorCode: undefined,
      errorMessage: undefined,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:05:00.000Z'),
    }

    const result = toStepRunResponseDto(stepRun)

    expect(result).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      stepKey: 'plan',
      status: 'succeeded',
      attempt: 1,
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      errorMessage: null,
      outputArtifactId: null,
    })
  })

  it('should map step run with null timestamps', () => {
    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.PENDING,
      attempt: 1,
      startedAt: undefined,
      completedAt: undefined,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }

    const result = toStepRunResponseDto(stepRun)

    expect(result.startedAt).toBeNull()
    expect(result.completedAt).toBeNull()
  })

  it('should map step run with error message', () => {
    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.FAILED,
      attempt: 2,
      errorCode: 'AGENT_ERROR',
      errorMessage: 'Agent execution failed: timeout',
      startedAt: new Date('2024-01-01T00:00:00.000Z'),
      completedAt: new Date('2024-01-01T00:05:00.000Z'),
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:05:00.000Z'),
    }

    const result = toStepRunResponseDto(stepRun)

    expect(result.status).toBe('failed')
    expect(result.errorMessage).toBe('Agent execution failed: timeout')
    expect(result.attempt).toBe(2)
  })

  it('should map step run without error message', () => {
    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.SUCCEEDED,
      attempt: 1,
      startedAt: new Date('2024-01-01T00:00:00.000Z'),
      completedAt: new Date('2024-01-01T00:05:00.000Z'),
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:05:00.000Z'),
    }

    const result = toStepRunResponseDto(stepRun)

    expect(result.errorMessage).toBeNull()
  })

  it('should convert Date to ISO string for startedAt', () => {
    const date = new Date('2024-06-15T10:30:45.123Z')
    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.RUNNING,
      attempt: 1,
      startedAt: date,
      completedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = toStepRunResponseDto(stepRun)

    expect(result.startedAt).toBe('2024-06-15T10:30:45.123Z')
  })

  it('should convert Date to ISO string for completedAt', () => {
    const startDate = new Date('2024-06-15T10:30:00.000Z')
    const endDate = new Date('2024-06-15T10:35:00.000Z')

    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.SUCCEEDED,
      attempt: 1,
      startedAt: startDate,
      completedAt: endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = toStepRunResponseDto(stepRun)

    expect(result.completedAt).toBe('2024-06-15T10:35:00.000Z')
  })

  it('should always set outputArtifactId to null', () => {
    const stepRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      runId: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174002',
      stepKey: 'plan',
      stepType: 'agent',
      status: StepStatus.SUCCEEDED,
      attempt: 1,
      output: { planId: 'plan-123', artifactId: 'artifact-456' },
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = toStepRunResponseDto(stepRun)

    // Current implementation doesn't extract outputArtifactId from output
    expect(result.outputArtifactId).toBeNull()
  })

  it('should map all step statuses correctly', () => {
    const statuses = [
      StepStatus.PENDING,
      StepStatus.RUNNING,
      StepStatus.SUCCEEDED,
      StepStatus.FAILED,
      StepStatus.SKIPPED,
    ]

    statuses.forEach((status) => {
      const stepRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        runId: '123e4567-e89b-12d3-a456-426614174001',
        organizationId: '123e4567-e89b-12d3-a456-426614174002',
        stepKey: 'plan',
        stepType: 'agent',
        status,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = toStepRunResponseDto(stepRun)

      expect(result.status).toBe(status.toLowerCase())
    })
  })
})
