import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApprovalStatus, type WorkflowApproval } from '../../../domain/entities/workflow-approval.entity'
import {
  ArtifactNotFoundError,
  InvalidStepTypeError,
  MissingPlanArtifactError,
} from '../../../domain/errors/workflow-approval.errors'
import { StepStatus, StepType } from '../../../domain/step-types'
import { WorkflowState } from '../../../domain/workflow-state'
import {
  ApprovalStepExecutor,
  type IArtifact,
  type IArtifactRepository,
  type ILogger,
} from '../approval-step-executor.service'

import type { WorkflowRun } from '../../../domain/entities/workflow-run.entity'
import type { CreateEventParams, IEventRepository } from '../../../domain/interfaces/event.repository.interface'
import type { IWorkflowApprovalRepository } from '../../../domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository, WorkflowStateUpdate } from '../../../domain/interfaces/workflow.repository.interface'
import type { StepDefinition } from '../workflow-definition'

describe('ApprovalStepExecutor', () => {
  let executor: ApprovalStepExecutor
  let mockApprovalRepo: IWorkflowApprovalRepository
  let mockWorkflowRepo: IWorkflowRepository
  let mockArtifactRepo: IArtifactRepository
  let mockEventRepo: IEventRepository
  let mockLogger: ILogger

  const mockRun: WorkflowRun = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    workflowKey: 'ai-sdlc-v1',
    workflowVersion: '1.0.0',
    organizationId: '550e8400-e29b-41d4-a716-446655440001',
    projectId: '550e8400-e29b-41d4-a716-446655440002',
    state: WorkflowState.RUNNING,
    initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
    input: {
      planArtifactId: '550e8400-e29b-41d4-a716-446655440004',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  }

  const mockStep: StepDefinition = {
    key: 'approval',
    type: StepType.APPROVAL,
    timeoutMs: 86400000,
  }

  const mockArtifact: IArtifact = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    content: JSON.stringify({ plan: 'implementation plan' }),
  }

  beforeEach(() => {
    mockApprovalRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByRunId: vi.fn(),
      findPendingByRunId: vi.fn(),
    }

    mockWorkflowRepo = {
      createRun: vi.fn(),
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
      findRunByIdempotencyKey: vi.fn(),
      cancelRun: vi.fn(),
      acquireLease: vi.fn(),
      renewLease: vi.fn(),
      releaseLease: vi.fn(),
      updateHeartbeat: vi.fn(),
      findExpiredLeases: vi.fn(),
    }

    mockArtifactRepo = {
      findById: vi.fn(),
    }

    mockEventRepo = {
      appendEvent: vi.fn(),
      findEventsByRunId: vi.fn(),
      getNextSequence: vi.fn(),
    }

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }

    executor = new ApprovalStepExecutor(mockApprovalRepo, mockWorkflowRepo, mockArtifactRepo, mockEventRepo, mockLogger)
  })

  describe('canHandle', () => {
    it('should return true for APPROVAL step type', () => {
      expect(executor.canHandle(StepType.APPROVAL)).toBe(true)
    })

    it('should return false for AGENT step type', () => {
      expect(executor.canHandle(StepType.AGENT)).toBe(false)
    })

    it('should return false for TOOL step type', () => {
      expect(executor.canHandle(StepType.TOOL)).toBe(false)
    })
  })

  describe('execute - success scenarios', () => {
    beforeEach(() => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(mockArtifact)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(undefined)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        sequence: 1,
        eventType: 'approval_requested',
        payload: {},
        createdAt: new Date(),
      })
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue(undefined)
    })

    it('should create pending approval and transition to waiting_approval state', async () => {
      const result = await executor.execute(mockStep, mockRun)

      expect(result.status).toBe(StepStatus.SUCCEEDED)
      expect(result.output).toMatchObject({
        status: 'approval_required',
        planArtifactId: '550e8400-e29b-41d4-a716-446655440004',
      })

      // Verify approval was saved
      expect(mockApprovalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowRunId: mockRun.id,
          status: ApprovalStatus.PENDING,
          planArtifactId: '550e8400-e29b-41d4-a716-446655440004',
        })
      )

      // Verify workflow state was updated
      expect(mockWorkflowRepo.updateRunState).toHaveBeenCalledWith(
        mockRun.id,
        expect.objectContaining({
          status: WorkflowState.WAITING_APPROVAL,
          currentStepKey: 'approval',
        })
      )
    })

    it('should emit approval_requested event with correct payload', async () => {
      await executor.execute(mockStep, mockRun)

      expect(mockEventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: mockRun.id,
          organizationId: mockRun.organizationId,
          eventType: 'approval_requested',
          payload: expect.objectContaining({
            planArtifactId: '550e8400-e29b-41d4-a716-446655440004',
          }),
        })
      )
    })

    it('should store artifact hash for version validation', async () => {
      await executor.execute(mockStep, mockRun)

      expect(mockApprovalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          planArtifactHash: expect.any(String),
        })
      )

      const savedApproval = vi.mocked(mockApprovalRepo.save).mock.calls[0][0]
      expect(savedApproval.planArtifactHash).toHaveLength(64) // SHA-256 hex length
    })

    it('should log success with context', async () => {
      await executor.execute(mockStep, mockRun)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Approval step executed successfully',
        expect.objectContaining({
          runId: mockRun.id,
          stepKey: 'approval',
          planArtifactId: '550e8400-e29b-41d4-a716-446655440004',
        })
      )
    })

    it('should return non-retryable result', async () => {
      const result = await executor.execute(mockStep, mockRun)

      expect(result.retryable).toBe(false)
    })
  })

  describe('execute - error scenarios', () => {
    it('should throw InvalidStepTypeError if step type is not APPROVAL', async () => {
      const invalidStep: StepDefinition = {
        key: 'plan',
        type: StepType.AGENT,
      }

      const result = await executor.execute(invalidStep, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorCode).toBe('INVALID_STEP_TYPE')
      expect(result.errorMessage).toContain('Invalid step type')
    })

    it('should throw MissingPlanArtifactError if artifact ID not in run input', async () => {
      const runWithoutArtifact = {
        ...mockRun,
        input: {},
      }

      const result = await executor.execute(mockStep, runWithoutArtifact)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorCode).toBe('MISSING_PLAN_ARTIFACT')
      expect(result.errorMessage).toContain('Missing plan artifact')
    })

    it('should throw ArtifactNotFoundError if artifact does not exist', async () => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(null)

      const result = await executor.execute(mockStep, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorCode).toBe('ARTIFACT_NOT_FOUND')
      expect(result.errorMessage).toContain('Artifact not found')
    })

    it('should handle repository save errors', async () => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(mockArtifact)
      vi.mocked(mockApprovalRepo.save).mockRejectedValue(new Error('Database connection failed'))

      const result = await executor.execute(mockStep, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorCode).toBe('APPROVAL_EXECUTION_ERROR')
      expect(result.errorMessage).toContain('Database connection failed')
    })

    it('should log errors with context', async () => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(null)

      await executor.execute(mockStep, mockRun)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Approval step execution failed',
        expect.objectContaining({
          runId: mockRun.id,
          stepKey: 'approval',
        })
      )
    })

    it('should handle event emission errors gracefully', async () => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(mockArtifact)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(undefined)
      vi.mocked(mockEventRepo.appendEvent).mockRejectedValue(new Error('Event bus unavailable'))

      const result = await executor.execute(mockStep, mockRun)

      expect(result.status).toBe(StepStatus.FAILED)
      expect(result.errorMessage).toContain('Event bus unavailable')
    })
  })

  describe('artifact hash generation', () => {
    it('should generate consistent hash for same content', async () => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(mockArtifact)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(undefined)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        sequence: 1,
        eventType: 'approval_requested',
        payload: {},
        createdAt: new Date(),
      })
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue(undefined)

      await executor.execute(mockStep, mockRun)
      const firstHash = vi.mocked(mockApprovalRepo.save).mock.calls[0][0].planArtifactHash

      vi.clearAllMocks()
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(mockArtifact)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(undefined)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({
        id: 'event-2',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        sequence: 2,
        eventType: 'approval_requested',
        payload: {},
        createdAt: new Date(),
      })
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue(undefined)

      await executor.execute(mockStep, mockRun)
      const secondHash = vi.mocked(mockApprovalRepo.save).mock.calls[0][0].planArtifactHash

      expect(firstHash).toBe(secondHash)
    })

    it('should generate different hash for different content', async () => {
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(mockArtifact)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(undefined)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({
        id: 'event-1',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        sequence: 1,
        eventType: 'approval_requested',
        payload: {},
        createdAt: new Date(),
      })
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue(undefined)

      await executor.execute(mockStep, mockRun)
      const firstHash = vi.mocked(mockApprovalRepo.save).mock.calls[0][0].planArtifactHash

      vi.clearAllMocks()
      const differentArtifact = {
        id: 'artifact-999',
        content: JSON.stringify({ plan: 'different plan' }),
      }
      vi.mocked(mockArtifactRepo.findById).mockResolvedValue(differentArtifact)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(undefined)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({
        id: 'event-2',
        runId: mockRun.id,
        organizationId: mockRun.organizationId,
        sequence: 2,
        eventType: 'approval_requested',
        payload: {},
        createdAt: new Date(),
      })
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue(undefined)

      await executor.execute(mockStep, mockRun)
      const secondHash = vi.mocked(mockApprovalRepo.save).mock.calls[0][0].planArtifactHash

      expect(firstHash).not.toBe(secondHash)
    })
  })
})
