import { DatabaseService, Prisma } from '@vyrak/database'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  WorkflowAlreadyExistsError,
  WorkflowNotFoundError,
  WorkflowRepositoryError,
} from '../../../domain/errors/common.error'
import { CreateRunParams } from '../../../domain/interfaces/workflow.repository.interface'
import { WorkflowState } from '../../../domain/workflow-state'
import { WorkflowPrismaRepository } from '../../../infras/repositories/workflow-prisma.repository'

describe('WorkflowPrismaRepository', () => {
  let repository: WorkflowPrismaRepository
  let db: DatabaseService

  const mockWorkflowRun = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    organizationId: '123e4567-e89b-12d3-a456-426614174001',
    projectId: '123e4567-e89b-12d3-a456-426614174002',
    workflowKey: 'deploy-app',
    workflowVersion: '1.0.0',
    status: 'queued',
    initiatedByUserId: '123e4567-e89b-12d3-a456-426614174003',
    idempotencyKey: '123e4567-e89b-12d3-a456-426614174004',
    input: { branch: 'main' },
    currentStepKey: null,
    cancelRequestedAt: null,
    errorCode: null,
    errorMessage: null,
    result: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  }

  beforeEach(() => {
    db = {
      client: {
        workflowRun: {
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      },
    } as any

    repository = new WorkflowPrismaRepository(db)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createRun', () => {
    const createParams: CreateRunParams = {
      organizationId: '123e4567-e89b-12d3-a456-426614174001',
      projectId: '123e4567-e89b-12d3-a456-426614174002',
      workflowKey: 'deploy-app',
      workflowVersion: '1.0.0',
      initiatedByUserId: '123e4567-e89b-12d3-a456-426614174003',
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174004',
      input: { branch: 'main' },
    }

    it('should create a workflow run successfully', async () => {
      vi.spyOn(db.client.workflowRun, 'create').mockResolvedValueOnce(mockWorkflowRun)

      const result = await repository.createRun(createParams)

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.state).toBe(WorkflowState.QUEUED)
      expect(result.workflowKey).toBe('deploy-app')
      expect(db.client.workflowRun.create).toHaveBeenCalledWith({
        data: {
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          projectId: '123e4567-e89b-12d3-a456-426614174002',
          workflowKey: 'deploy-app',
          workflowVersion: '1.0.0',
          initiatedByUserId: '123e4567-e89b-12d3-a456-426614174003',
          idempotencyKey: '123e4567-e89b-12d3-a456-426614174004',
          input: { branch: 'main' },
          status: WorkflowState.QUEUED,
        },
      })
    })

    it('should throw WorkflowAlreadyExistsError on duplicate idempotency key', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      })

      vi.spyOn(db.client.workflowRun, 'create').mockRejectedValue(prismaError)

      await expect(repository.createRun(createParams)).rejects.toThrow(WorkflowAlreadyExistsError)
      await expect(repository.createRun(createParams)).rejects.toThrow(
        /Workflow run with idempotency key already exists/
      )
    })

    it('should throw WorkflowRepositoryError on other database errors', async () => {
      vi.spyOn(db.client.workflowRun, 'create').mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(repository.createRun(createParams)).rejects.toThrow(WorkflowRepositoryError)
      await expect(repository.createRun(createParams)).rejects.toThrow(/Failed to create workflow run/)
    })

    it('should handle missing optional fields', async () => {
      const paramsWithoutOptionals: CreateRunParams = {
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        projectId: '123e4567-e89b-12d3-a456-426614174002',
        workflowKey: 'deploy-app',
        workflowVersion: '1.0.0',
        initiatedByUserId: '123e4567-e89b-12d3-a456-426614174003',
      }

      const runWithoutOptionals = {
        ...mockWorkflowRun,
        idempotencyKey: null,
        input: null,
      }

      vi.spyOn(db.client.workflowRun, 'create').mockResolvedValueOnce(runWithoutOptionals)

      const result = await repository.createRun(paramsWithoutOptionals)

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(db.client.workflowRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idempotencyKey: expect.any(String), // Auto-generated
          input: null,
        }),
      })
    })
  })

  describe('findRunById', () => {
    it('should return workflow run by id', async () => {
      vi.spyOn(db.client.workflowRun, 'findUnique').mockResolvedValueOnce(mockWorkflowRun)

      const result = await repository.findRunById('123e4567-e89b-12d3-a456-426614174000')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result?.state).toBe(WorkflowState.QUEUED)
      expect(db.client.workflowRun.findUnique).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      })
    })

    it('should return null if run not found', async () => {
      vi.spyOn(db.client.workflowRun, 'findUnique').mockResolvedValueOnce(null)

      const result = await repository.findRunById('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw WorkflowRepositoryError on database error', async () => {
      vi.spyOn(db.client.workflowRun, 'findUnique').mockRejectedValueOnce(new Error('Database error'))

      await expect(repository.findRunById('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        WorkflowRepositoryError
      )
    })
  })

  describe('updateRunState', () => {
    it('should update workflow run state', async () => {
      const stateUpdate = {
        status: WorkflowState.RUNNING,
        currentStepKey: 'step-1',
        startedAt: new Date('2024-01-01T01:00:00Z'),
      }

      vi.spyOn(db.client.workflowRun, 'update').mockResolvedValueOnce({
        ...mockWorkflowRun,
        status: 'running',
        currentStepKey: 'step-1',
        startedAt: stateUpdate.startedAt,
      })

      await repository.updateRunState('123e4567-e89b-12d3-a456-426614174000', stateUpdate)

      expect(db.client.workflowRun.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: {
          status: WorkflowState.RUNNING,
          currentStepKey: 'step-1',
          errorCode: undefined,
          errorMessage: undefined,
          startedAt: stateUpdate.startedAt,
          completedAt: undefined,
        },
      })
    })

    it('should update with error details', async () => {
      const stateUpdate = {
        status: WorkflowState.FAILED,
        errorCode: 'DEPLOY_FAILED',
        errorMessage: 'Deployment failed due to missing credentials',
        completedAt: new Date('2024-01-01T02:00:00Z'),
      }

      vi.spyOn(db.client.workflowRun, 'update').mockResolvedValueOnce({
        ...mockWorkflowRun,
        status: 'failed',
        errorCode: 'DEPLOY_FAILED',
        errorMessage: 'Deployment failed due to missing credentials',
        completedAt: stateUpdate.completedAt,
      })

      await repository.updateRunState('123e4567-e89b-12d3-a456-426614174000', stateUpdate)

      expect(db.client.workflowRun.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: stateUpdate,
      })
    })

    it('should throw WorkflowNotFoundError if run not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })

      vi.spyOn(db.client.workflowRun, 'update').mockRejectedValueOnce(prismaError)

      await expect(repository.updateRunState('nonexistent', { status: WorkflowState.RUNNING })).rejects.toThrow(
        WorkflowNotFoundError
      )
    })

    it('should throw WorkflowRepositoryError on other database errors', async () => {
      vi.spyOn(db.client.workflowRun, 'update').mockRejectedValueOnce(new Error('Database error'))

      await expect(
        repository.updateRunState('123e4567-e89b-12d3-a456-426614174000', { status: WorkflowState.RUNNING })
      ).rejects.toThrow(WorkflowRepositoryError)
    })
  })

  describe('findRunByIdempotencyKey', () => {
    it('should find run by idempotency key', async () => {
      vi.spyOn(db.client.workflowRun, 'findUnique').mockResolvedValueOnce(mockWorkflowRun)

      const result = await repository.findRunByIdempotencyKey(
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174004'
      )

      expect(result).not.toBeNull()
      expect(result?.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result?.idempotencyKey).toBe('123e4567-e89b-12d3-a456-426614174004')
      expect(db.client.workflowRun.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_idempotencyKey: {
            organizationId: '123e4567-e89b-12d3-a456-426614174001',
            idempotencyKey: '123e4567-e89b-12d3-a456-426614174004',
          },
        },
      })
    })

    it('should return null if idempotency key not found', async () => {
      vi.spyOn(db.client.workflowRun, 'findUnique').mockResolvedValueOnce(null)

      const result = await repository.findRunByIdempotencyKey('123e4567-e89b-12d3-a456-426614174001', 'nonexistent')

      expect(result).toBeNull()
    })

    it('should throw WorkflowRepositoryError on database error', async () => {
      vi.spyOn(db.client.workflowRun, 'findUnique').mockRejectedValueOnce(new Error('Database error'))

      await expect(
        repository.findRunByIdempotencyKey(
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174004'
        )
      ).rejects.toThrow(WorkflowRepositoryError)
    })
  })

  describe('cancelRun', () => {
    it('should cancel a workflow run', async () => {
      const cancelledAt = new Date('2024-01-01T01:30:00Z')
      vi.useFakeTimers().setSystemTime(cancelledAt)

      vi.spyOn(db.client.workflowRun, 'update').mockResolvedValueOnce({
        ...mockWorkflowRun,
        status: 'cancelled',
        cancelRequestedAt: cancelledAt,
      })

      await repository.cancelRun('123e4567-e89b-12d3-a456-426614174000')

      expect(db.client.workflowRun.update).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        data: {
          cancelRequestedAt: cancelledAt,
          status: WorkflowState.CANCELLED,
        },
      })

      vi.useRealTimers()
    })

    it('should throw WorkflowNotFoundError if run not found', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })

      vi.spyOn(db.client.workflowRun, 'update').mockRejectedValueOnce(prismaError)

      await expect(repository.cancelRun('nonexistent')).rejects.toThrow(WorkflowNotFoundError)
    })

    it('should throw WorkflowRepositoryError on other database errors', async () => {
      vi.spyOn(db.client.workflowRun, 'update').mockRejectedValueOnce(new Error('Database error'))

      await expect(repository.cancelRun('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        WorkflowRepositoryError
      )
    })
  })
})
