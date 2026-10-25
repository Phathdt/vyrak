import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StartWorkflowUseCase } from './start-workflow.use-case'

import type { WorkflowRun } from '../../domain/entities'
import type { IEventRepository, IJobQueue, IWorkflowRepository } from '../../domain/interfaces'
import { WorkflowState } from '../../domain/workflow-state'
import type { StartWorkflowInput } from '../dtos/start-workflow.dto'

describe('StartWorkflowUseCase', () => {
  let useCase: StartWorkflowUseCase
  let workflowRepo: IWorkflowRepository
  let eventRepo: IEventRepository
  let jobQueue: IJobQueue

  const mockWorkflowRun: WorkflowRun = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    workflowKey: 'test-workflow',
    workflowVersion: '1.0.0',
    organizationId: '660e8400-e29b-41d4-a716-446655440000',
    projectId: '770e8400-e29b-41d4-a716-446655440000',
    state: WorkflowState.QUEUED,
    initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2026-10-25T10:00:00Z'),
    updatedAt: new Date('2026-10-25T10:00:00Z'),
  }

  beforeEach(() => {
    // Create mock repositories
    workflowRepo = {
      createRun: vi.fn(),
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
      findRunByIdempotencyKey: vi.fn(),
      cancelRun: vi.fn(),
    }

    eventRepo = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
      getNextSequence: vi.fn(),
    }

    jobQueue = {
      enqueueWorkflowJob: vi.fn(),
      enqueueStepJob: vi.fn(),
    }

    // Create use case instance with job queue (Story 2.2)
    useCase = new StartWorkflowUseCase(workflowRepo, eventRepo, jobQueue)
  })

  describe('execute', () => {
    const validInput: StartWorkflowInput = {
      organizationId: '660e8400-e29b-41d4-a716-446655440000',
      projectId: '770e8400-e29b-41d4-a716-446655440000',
      workflowKey: 'test-workflow',
      workflowVersion: '1.0.0',
      initiatedByUserId: '880e8400-e29b-41d4-a716-446655440000',
    }

    it('should create workflow run with QUEUED state', async () => {
      // Arrange
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      vi.mocked(eventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        stepRunId: undefined,
        sequenceNumber: 1,
        eventType: 'run_created',
        payload: {},
        occurredAt: new Date(),
      })

      // Act
      const result = await useCase.execute(validInput)

      // Assert
      expect(result).toEqual(mockWorkflowRun)
      expect(workflowRepo.createRun).toHaveBeenCalledOnce()
      expect(workflowRepo.createRun).toHaveBeenCalledWith({
        organizationId: validInput.organizationId,
        projectId: validInput.projectId,
        workflowKey: validInput.workflowKey,
        workflowVersion: validInput.workflowVersion,
        initiatedByUserId: validInput.initiatedByUserId,
        idempotencyKey: undefined,
        input: undefined,
      })
    })

    it('should pass input data to workflow run creation', async () => {
      // Arrange
      const inputWithData: StartWorkflowInput = {
        ...validInput,
        input: { userId: '123', action: 'process' },
      }
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      vi.mocked(eventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        eventType: 'run_created',
        sequenceNumber: 1,
        payload: {},
        occurredAt: new Date(),
      })

      // Act
      await useCase.execute(inputWithData)

      // Assert
      expect(workflowRepo.createRun).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { userId: '123', action: 'process' },
        })
      )
    })

    it('should emit run_created event after workflow creation', async () => {
      // Arrange
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      vi.mocked(eventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        eventType: 'run_created',
        sequenceNumber: 1,
        payload: {},
        occurredAt: new Date(),
      })

      // Act
      await useCase.execute(validInput)

      // Assert
      expect(eventRepo.appendEvent).toHaveBeenCalledOnce()
      expect(eventRepo.appendEvent).toHaveBeenCalledWith({
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        eventType: 'run_created',
        payload: {
          workflowKey: validInput.workflowKey,
          workflowVersion: validInput.workflowVersion,
          initiatedByUserId: validInput.initiatedByUserId,
          projectId: validInput.projectId,
        },
      })
    })

    it('should return existing run for duplicate idempotency key', async () => {
      // Arrange
      const inputWithKey: StartWorkflowInput = {
        ...validInput,
        idempotencyKey: 'unique-key-123',
      }
      vi.mocked(workflowRepo.findRunByIdempotencyKey).mockResolvedValue(mockWorkflowRun)

      // Act
      const result = await useCase.execute(inputWithKey)

      // Assert
      expect(result).toEqual(mockWorkflowRun)
      expect(workflowRepo.findRunByIdempotencyKey).toHaveBeenCalledOnce()
      expect(workflowRepo.findRunByIdempotencyKey).toHaveBeenCalledWith(validInput.organizationId, 'unique-key-123')
      // Should NOT create new run
      expect(workflowRepo.createRun).not.toHaveBeenCalled()
      // Should NOT emit event
      expect(eventRepo.appendEvent).not.toHaveBeenCalled()
    })

    it('should create new run if idempotency key does not exist', async () => {
      // Arrange
      const inputWithKey: StartWorkflowInput = {
        ...validInput,
        idempotencyKey: 'new-unique-key',
      }
      vi.mocked(workflowRepo.findRunByIdempotencyKey).mockResolvedValue(null)
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      vi.mocked(eventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        eventType: 'run_created',
        sequenceNumber: 1,
        payload: {},
        occurredAt: new Date(),
      })

      // Act
      const result = await useCase.execute(inputWithKey)

      // Assert
      expect(workflowRepo.findRunByIdempotencyKey).toHaveBeenCalledWith(validInput.organizationId, 'new-unique-key')
      expect(workflowRepo.createRun).toHaveBeenCalledOnce()
      expect(workflowRepo.createRun).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'new-unique-key',
        })
      )
      expect(eventRepo.appendEvent).toHaveBeenCalledOnce()
      expect(result).toEqual(mockWorkflowRun)
    })

    it('should not check idempotency if key is not provided', async () => {
      // Arrange
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      vi.mocked(eventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        eventType: 'run_created',
        sequenceNumber: 1,
        payload: {},
        occurredAt: new Date(),
      })

      // Act
      await useCase.execute(validInput)

      // Assert
      expect(workflowRepo.findRunByIdempotencyKey).not.toHaveBeenCalled()
      expect(workflowRepo.createRun).toHaveBeenCalledOnce()
    })

    it('should propagate repository errors', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(workflowRepo.createRun).mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow('Database connection failed')
    })

    it('should propagate event repository errors', async () => {
      // Arrange
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      const error = new Error('Event storage failed')
      vi.mocked(eventRepo.appendEvent).mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(validInput)).rejects.toThrow('Event storage failed')
    })

    it('should handle workflow run creation with all optional fields', async () => {
      // Arrange
      const fullInput: StartWorkflowInput = {
        ...validInput,
        idempotencyKey: 'full-key-123',
        input: {
          userId: '999',
          metadata: { source: 'api', version: 2 },
        },
      }
      vi.mocked(workflowRepo.findRunByIdempotencyKey).mockResolvedValue(null)
      vi.mocked(workflowRepo.createRun).mockResolvedValue(mockWorkflowRun)
      vi.mocked(eventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockWorkflowRun.id,
        organizationId: validInput.organizationId,
        eventType: 'run_created',
        sequenceNumber: 1,
        payload: {},
        occurredAt: new Date(),
      })
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue()

      // Act
      await useCase.execute(fullInput)

      // Assert
      expect(workflowRepo.createRun).toHaveBeenCalledWith({
        organizationId: fullInput.organizationId,
        projectId: fullInput.projectId,
        workflowKey: fullInput.workflowKey,
        workflowVersion: fullInput.workflowVersion,
        initiatedByUserId: fullInput.initiatedByUserId,
        idempotencyKey: 'full-key-123',
        input: {
          userId: '999',
          metadata: { source: 'api', version: 2 },
        },
      })
    })
  })
})
