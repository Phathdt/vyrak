import { Logger } from '@nestjs/common'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeStepExecutor } from './fake-step-executor'
import type { LeaseManager } from './lease-manager.service'
import type { RetryHandler } from './retry-handler.service'
import { StepExecutorResult } from './step-executor.interface'
import { WorkflowExecutorService } from './workflow-executor.service'

import { IEventRepository, IStepRepository, IWorkflowRepository, StepStatus, WorkflowState } from '../../domain'
import { StepRun, WorkflowRun } from '../../domain/entities'
import type { IJobQueue } from '../../domain/interfaces'

describe('WorkflowExecutorService', () => {
  let service: WorkflowExecutorService
  let workflowRepo: IWorkflowRepository
  let stepRepo: IStepRepository
  let eventRepo: IEventRepository
  let jobQueue: IJobQueue
  let fakeExecutor: FakeStepExecutor
  let retryHandler: jest.Mocked<RetryHandler>
  let leaseManager: jest.Mocked<LeaseManager>

  const mockRun: WorkflowRun = {
    id: 'run-123',
    workflowKey: 'ai-sdlc-v1',
    workflowVersion: '1.0.0',
    organizationId: 'org-123',
    projectId: 'proj-123',
    state: WorkflowState.QUEUED,
    initiatedByUserId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    // Mock repositories
    workflowRepo = {
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
      createRun: vi.fn(),
      findRunByIdempotencyKey: vi.fn(),
      cancelRun: vi.fn(),
      acquireLease: vi.fn(),
      renewLease: vi.fn(),
      releaseLease: vi.fn(),
      updateHeartbeat: vi.fn(),
      findExpiredLeases: vi.fn(),
    }

    stepRepo = {
      createStepRun: vi.fn(),
      findStepsByRunId: vi.fn(),
      updateStepStatus: vi.fn(),
      incrementAttempt: vi.fn(),
      findById: vi.fn(),
    }

    eventRepo = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
    }

    jobQueue = {
      enqueueWorkflowJob: vi.fn(),
      enqueueStepJob: vi.fn(),
    }

    // Create fake executor
    fakeExecutor = new FakeStepExecutor()

    // Mock retry handler
    retryHandler = {
      shouldRetry: vi.fn().mockReturnValue(false),
      getNextBackoff: vi.fn().mockReturnValue(1000),
    } as unknown as jest.Mocked<RetryHandler>

    // Mock lease manager
    leaseManager = {
      acquireLease: vi.fn().mockResolvedValue(true),
      renewLease: vi.fn().mockResolvedValue(true),
      releaseLease: vi.fn().mockResolvedValue(undefined),
      findExpiredLeases: vi.fn().mockResolvedValue([]),
      hasActiveLease: vi.fn().mockReturnValue(true),
      getWorkerId: vi.fn().mockReturnValue('test-worker-id'),
      onModuleDestroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<LeaseManager>

    // Create service with mocks
    service = new WorkflowExecutorService(
      workflowRepo,
      stepRepo,
      eventRepo,
      jobQueue,
      [fakeExecutor],
      retryHandler,
      leaseManager
    )

    // Suppress logger output in tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
  })

  describe('executeRun', () => {
    it('should throw error if run not found', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(null)

      await expect(service.executeRun('non-existent')).rejects.toThrow('Workflow run not found')
    })

    it('should throw error if run in invalid state', async () => {
      const completedRun = { ...mockRun, state: WorkflowState.SUCCEEDED }
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(completedRun)

      await expect(service.executeRun('run-123')).rejects.toThrow('Invalid state for execution')
    })

    it('should skip execution if lease cannot be acquired', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(leaseManager.acquireLease).mockResolvedValue(false)

      await service.executeRun('run-123')

      // Should not update state or create steps
      expect(workflowRepo.updateRunState).not.toHaveBeenCalled()
      expect(stepRepo.createStepRun).not.toHaveBeenCalled()
    })

    it('should transition QUEUED run to RUNNING', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.executeRun('run-123')

      expect(workflowRepo.updateRunState).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: WorkflowState.RUNNING,
          startedAt: expect.any(Date),
        })
      )

      expect(eventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-123',
          eventType: 'run_started',
        })
      )
    })

    it('should execute first step when no steps completed', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.executeRun('run-123')

      expect(stepRepo.createStepRun).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-123',
          stepKey: 'plan',
          stepType: 'agent',
        })
      )

      expect(stepRepo.updateStepStatus).toHaveBeenCalledWith(
        'step-run-1',
        StepStatus.RUNNING,
        expect.objectContaining({ startedAt: expect.any(Date) })
      )

      expect(stepRepo.updateStepStatus).toHaveBeenCalledWith(
        'step-run-1',
        StepStatus.SUCCEEDED,
        expect.objectContaining({ completedAt: expect.any(Date) })
      )
    })

    it('should queue next step on successful step completion', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.executeRun('run-123')

      expect(jobQueue.enqueueWorkflowJob).toHaveBeenCalledWith('run-123', 'org-123')

      expect(eventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'step_completed',
          payload: expect.objectContaining({
            stepKey: 'plan',
            status: StepStatus.SUCCEEDED,
          }),
        })
      )
    })

    it('should execute second step when first step completed', async () => {
      const runningRun = { ...mockRun, state: WorkflowState.RUNNING }
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(runningRun)

      // First step already completed
      const completedStep: StepRun = {
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.SUCCEEDED,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([completedStep])

      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-2',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'approval',
        stepType: 'approval',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.executeRun('run-123')

      // Should create second step (approval)
      expect(stepRepo.createStepRun).toHaveBeenCalledWith(
        expect.objectContaining({
          stepKey: 'approval',
          stepType: 'approval',
        })
      )
    })

    it('should complete workflow when all steps succeeded', async () => {
      const runningRun = { ...mockRun, state: WorkflowState.RUNNING }
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(runningRun)

      // All steps completed
      const completedSteps: StepRun[] = [
        {
          id: 'step-run-1',
          runId: mockRun.id,
          organizationId: mockRun.organizationId,
          stepKey: 'plan',
          stepType: 'agent',
          status: StepStatus.SUCCEEDED,
          attempt: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'step-run-2',
          runId: mockRun.id,
          organizationId: mockRun.organizationId,
          stepKey: 'approval',
          stepType: 'approval',
          status: StepStatus.SUCCEEDED,
          attempt: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'step-run-3',
          runId: mockRun.id,
          organizationId: mockRun.organizationId,
          stepKey: 'implement',
          stepType: 'agent',
          status: StepStatus.SUCCEEDED,
          attempt: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue(completedSteps)

      await service.executeRun('run-123')

      expect(workflowRepo.updateRunState).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: WorkflowState.SUCCEEDED,
          completedAt: expect.any(Date),
        })
      )

      expect(eventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'run_succeeded',
        })
      )

      // Should not queue any more jobs
      expect(jobQueue.enqueueWorkflowJob).not.toHaveBeenCalled()
    })

    it('should fail workflow on non-retryable step failure', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Configure fake executor to return failure
      const failureResult: StepExecutorResult = {
        status: StepStatus.FAILED,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'Step failed',
        retryable: false,
      }
      fakeExecutor.setMockResult('plan', failureResult)

      await service.executeRun('run-123')

      expect(workflowRepo.updateRunState).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: WorkflowState.FAILED,
          errorCode: 'INVALID_INPUT',
          errorMessage: 'Step failed',
        })
      )

      expect(eventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'run_failed',
          payload: expect.objectContaining({
            errorCode: 'INVALID_INPUT',
            errorMessage: 'Step failed',
          }),
        })
      )
    })

    it('should fail workflow on retryable step failure (retry not implemented yet)', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Configure fake executor to return retryable failure
      const failureResult: StepExecutorResult = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        errorMessage: 'Step timed out',
        retryable: true,
      }
      fakeExecutor.setMockResult('plan', failureResult)

      await service.executeRun('run-123')

      // Should still fail workflow (retry logic not implemented in Story 2.3)
      expect(workflowRepo.updateRunState).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: WorkflowState.FAILED,
        })
      )
    })

    it('should emit step events in correct order', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.executeRun('run-123')

      const eventCalls = vi.mocked(eventRepo.appendEvent).mock.calls

      // Should have events: run_started, step_started, step_completed
      expect(eventCalls).toHaveLength(3)
      expect(eventCalls[0][0].eventType).toBe('run_started')
      expect(eventCalls[1][0].eventType).toBe('step_started')
      expect(eventCalls[2][0].eventType).toBe('step_completed')
    })

    it('should fail workflow if no executor found for step type', async () => {
      // Create service without executors
      const serviceWithoutExecutors = new WorkflowExecutorService(
        workflowRepo,
        stepRepo,
        eventRepo,
        jobQueue,
        [],
        retryHandler,
        leaseManager
      )

      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await serviceWithoutExecutors.executeRun('run-123')

      // Should fail the workflow
      expect(workflowRepo.updateRunState).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: WorkflowState.FAILED,
          errorCode: 'EXECUTION_ERROR',
          errorMessage: 'No executor found for step type: agent',
        })
      )
    })

    it('should handle unexpected execution errors', async () => {
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockRejectedValue(new Error('Database error'))

      await service.executeRun('run-123')

      expect(workflowRepo.updateRunState).toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({
          status: WorkflowState.FAILED,
          errorCode: 'EXECUTION_ERROR',
          errorMessage: 'Database error',
        })
      )
    })

    it('should throw error for unknown workflow key', async () => {
      const unknownRun = { ...mockRun, workflowKey: 'unknown-workflow' }
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(unknownRun)

      await expect(service.executeRun('run-123')).rejects.toThrow('Workflow definition not found')
    })

    it('should not transition state if run already RUNNING', async () => {
      const runningRun = { ...mockRun, state: WorkflowState.RUNNING }
      vi.mocked(workflowRepo.findRunById).mockResolvedValue(runningRun)
      vi.mocked(stepRepo.findStepsByRunId).mockResolvedValue([])
      vi.mocked(stepRepo.createStepRun).mockResolvedValue({
        id: 'step-run-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        stepKey: 'plan',
        stepType: 'agent',
        status: StepStatus.PENDING,
        attempt: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await service.executeRun('run-123')

      // Should not call updateRunState for RUNNING transition
      expect(workflowRepo.updateRunState).not.toHaveBeenCalledWith(
        'run-123',
        expect.objectContaining({ status: WorkflowState.RUNNING })
      )
    })
  })
})
