import { DatabaseService } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StepPrismaRepository } from './step-prisma.repository'

import { StepNotFoundError, StepStatus } from '../../domain'

describe('StepPrismaRepository', () => {
  let repository: StepPrismaRepository
  let db: DatabaseService

  const mockPrismaStep = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    runId: '550e8400-e29b-41d4-a716-446655440001',
    organizationId: '550e8400-e29b-41d4-a716-446655440002',
    stepKey: 'deploy',
    stepType: 'http',
    status: StepStatus.PENDING,
    attempt: 1,
    input: { url: 'https://example.com' },
    output: null,
    errorCode: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-10-25T10:00:00Z'),
    updatedAt: new Date('2026-10-25T10:00:00Z'),
  }

  beforeEach(() => {
    db = {
      client: {
        workflowStepRun: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      },
    } as any

    repository = new StepPrismaRepository(db)
  })

  describe('createStepRun', () => {
    it('should create a step run', async () => {
      const params = {
        runId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        stepKey: 'deploy',
        stepType: 'http',
        input: { url: 'https://example.com' },
      }

      vi.spyOn(db.client.workflowStepRun, 'create').mockResolvedValueOnce(mockPrismaStep)

      const result = await repository.createStepRun(params)

      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.status).toBe(StepStatus.PENDING)
      expect(result.attempt).toBe(1)
      expect(result.stepKey).toBe('deploy')
      expect(result.stepType).toBe('http')
      expect(db.client.workflowStepRun.create).toHaveBeenCalledWith({
        data: {
          runId: params.runId,
          organizationId: params.organizationId,
          stepKey: params.stepKey,
          stepType: params.stepType,
          input: params.input,
          status: StepStatus.PENDING,
          attempt: 1,
        },
      })
    })
  })

  describe('findStepsByRunId', () => {
    it('should find all steps for a run ordered by creation', async () => {
      const mockSteps = [
        {
          ...mockPrismaStep,
          id: '550e8400-e29b-41d4-a716-446655440010',
          stepKey: 'validate',
          status: StepStatus.SUCCEEDED,
          createdAt: new Date('2026-10-25T10:00:00Z'),
        },
        {
          ...mockPrismaStep,
          id: '550e8400-e29b-41d4-a716-446655440011',
          stepKey: 'deploy',
          status: StepStatus.RUNNING,
          createdAt: new Date('2026-10-25T10:05:00Z'),
        },
      ]

      vi.spyOn(db.client.workflowStepRun, 'findMany').mockResolvedValueOnce(mockSteps)

      const result = await repository.findStepsByRunId('550e8400-e29b-41d4-a716-446655440001')

      expect(result).toHaveLength(2)
      expect(result[0].stepKey).toBe('validate')
      expect(result[1].stepKey).toBe('deploy')
      expect(db.client.workflowStepRun.findMany).toHaveBeenCalledWith({
        where: { runId: '550e8400-e29b-41d4-a716-446655440001' },
        orderBy: { createdAt: 'asc' },
      })
    })
  })

  describe('updateStepStatus', () => {
    it('should update step status with result', async () => {
      const result = {
        output: { success: true },
        completedAt: new Date('2026-10-25T10:10:00Z'),
      }

      vi.spyOn(db.client.workflowStepRun, 'update').mockResolvedValueOnce({} as any)

      await repository.updateStepStatus('550e8400-e29b-41d4-a716-446655440000', StepStatus.SUCCEEDED, result)

      expect(db.client.workflowStepRun.update).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        data: {
          status: StepStatus.SUCCEEDED,
          output: result.output,
          errorCode: undefined,
          errorMessage: undefined,
          startedAt: undefined,
          completedAt: result.completedAt,
        },
      })
    })

    it('should throw StepNotFoundError if step not found', async () => {
      class PrismaError extends Error {
        code = 'P2025'
        constructor(message: string) {
          super(message)
          this.name = 'PrismaClientKnownRequestError'
        }
      }
      const error = new PrismaError('Record not found')

      vi.spyOn(db.client.workflowStepRun, 'update').mockRejectedValueOnce(error)

      await expect(repository.updateStepStatus('nonexistent', StepStatus.FAILED)).rejects.toThrow(StepNotFoundError)
    })
  })

  describe('incrementAttempt', () => {
    it('should increment attempt number and reset to pending', async () => {
      vi.spyOn(db.client.workflowStepRun, 'update').mockResolvedValueOnce({ attempt: 2 } as any)

      const result = await repository.incrementAttempt('550e8400-e29b-41d4-a716-446655440000')

      expect(result).toBe(2)
      expect(db.client.workflowStepRun.update).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        data: {
          attempt: { increment: 1 },
          status: StepStatus.PENDING,
        },
        select: { attempt: true },
      })
    })

    it('should throw StepNotFoundError if step not found', async () => {
      class PrismaError extends Error {
        code = 'P2025'
        constructor(message: string) {
          super(message)
          this.name = 'PrismaClientKnownRequestError'
        }
      }
      const error = new PrismaError('Record not found')

      vi.spyOn(db.client.workflowStepRun, 'update').mockRejectedValueOnce(error)

      await expect(repository.incrementAttempt('nonexistent')).rejects.toThrow(StepNotFoundError)
    })
  })

  describe('findById', () => {
    it('should find a step by ID', async () => {
      vi.spyOn(db.client.workflowStepRun, 'findUnique').mockResolvedValueOnce(mockPrismaStep)

      const result = await repository.findById('550e8400-e29b-41d4-a716-446655440000')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result?.stepKey).toBe('deploy')
      expect(result?.stepType).toBe('http')
    })

    it('should return null if step not found', async () => {
      vi.spyOn(db.client.workflowStepRun, 'findUnique').mockResolvedValueOnce(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
    })
  })
})
