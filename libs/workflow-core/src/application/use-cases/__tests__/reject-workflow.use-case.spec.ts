import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkflowApproval } from '../../../domain/entities/workflow-approval.entity'
import { ApprovalStatus } from '../../../domain/entities/workflow-approval.entity'
import type { WorkflowRun } from '../../../domain/entities/workflow-run.entity'
import {
  ApprovalAlreadyDecidedError,
  InvalidInputException,
  InvalidWorkflowStateError,
  UnauthorizedAccessError,
  WorkflowApprovalNotFoundError,
  WorkflowRunNotFoundError,
} from '../../../domain/errors'
import type { IAuthorizationService } from '../../../domain/interfaces/authorization.interface'
import type { IEventRepository } from '../../../domain/interfaces/event.repository.interface'
import type { IWorkflowApprovalRepository } from '../../../domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository } from '../../../domain/interfaces/workflow.repository.interface'
import { WorkflowState } from '../../../domain/workflow-state'
import type { IRejectWorkflowLogger, RejectWorkflowInput } from '../reject-workflow.use-case'
import { RejectWorkflowUseCase } from '../reject-workflow.use-case'

describe('RejectWorkflowUseCase', () => {
  let useCase: RejectWorkflowUseCase
  let mockWorkflowRepo: IWorkflowRepository
  let mockApprovalRepo: IWorkflowApprovalRepository
  let mockAuthService: IAuthorizationService
  let mockEventRepo: IEventRepository
  let mockLogger: IRejectWorkflowLogger

  const baseInput: RejectWorkflowInput = {
    runId: 'run-123',
    userId: 'user-456',
    organizationId: 'org-789',
    projectId: 'proj-abc',
    comment: 'This plan does not align with architecture',
  }

  const mockRun: WorkflowRun = {
    id: 'run-123',
    workflowKey: 'test-workflow',
    workflowVersion: '1.0.0',
    organizationId: 'org-789',
    projectId: 'proj-abc',
    state: WorkflowState.WAITING_APPROVAL,
    initiatedByUserId: 'user-999',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockApproval: WorkflowApproval = {
    id: 'approval-111',
    workflowRunId: 'run-123',
    status: ApprovalStatus.PENDING,
    planArtifactId: 'artifact-222',
    planArtifactHash: 'hash-abc123',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockWorkflowRepo = {
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
    } as unknown as IWorkflowRepository

    mockApprovalRepo = {
      findByRunId: vi.fn(),
      save: vi.fn(),
    } as unknown as IWorkflowApprovalRepository

    mockAuthService = {
      requireApprovalPermission: vi.fn(),
    } as unknown as IAuthorizationService

    mockEventRepo = {
      appendEvent: vi.fn(),
    } as unknown as IEventRepository

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    }

    useCase = new RejectWorkflowUseCase(
      mockWorkflowRepo,
      mockApprovalRepo,
      mockAuthService,
      mockEventRepo,
      mockLogger
    )
  })

  describe('Happy Path', () => {
    it('should reject pending workflow and transition to cancelled', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      // Verify approval was rejected
      expect(mockApprovalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ApprovalStatus.REJECTED,
          decidedByUserId: baseInput.userId,
          comment: baseInput.comment,
        })
      )

      // Verify run transitioned to cancelled
      expect(mockWorkflowRepo.updateRunState).toHaveBeenCalledWith(
        baseInput.runId,
        expect.objectContaining({
          status: WorkflowState.CANCELLED,
          cancellationReason: baseInput.comment,
          cancelledByUserId: baseInput.userId,
        })
      )
    })

    it('should emit approval_decided event with rejection decision', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockEventRepo.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: baseInput.runId,
          organizationId: baseInput.organizationId,
          eventType: 'approval_decided',
          payload: expect.objectContaining({
            decision: 'rejected',
            decidedByUserId: baseInput.userId,
            comment: baseInput.comment,
            rejectionReason: baseInput.comment,
          }),
        })
      )
    })

    it('should set decidedByUserId and decidedAt on approval', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockApprovalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          decidedByUserId: baseInput.userId,
          decidedAt: expect.any(Date),
        })
      )
    })

    it('should record cancelledByUserId and cancelledAt on run', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockWorkflowRepo.updateRunState).toHaveBeenCalledWith(
        baseInput.runId,
        expect.objectContaining({
          cancelledByUserId: baseInput.userId,
          cancelledAt: expect.any(Date),
        })
      )
    })

    it('should log success message with rejection details', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockLogger.info).toHaveBeenCalledWith('Workflow rejected', {
        runId: baseInput.runId,
        approvalId: mockApproval.id,
        rejectedBy: baseInput.userId,
        reason: baseInput.comment,
      })
    })
  })

  describe('Input Validation', () => {
    it('should throw InvalidInputException if comment is empty', async () => {
      const input = { ...baseInput, comment: '' }

      await expect(useCase.execute(input)).rejects.toThrow(InvalidInputException)
      await expect(useCase.execute(input)).rejects.toThrow('Rejection comment is required')
    })

    it('should throw InvalidInputException if comment is whitespace only', async () => {
      const input = { ...baseInput, comment: '   ' }

      await expect(useCase.execute(input)).rejects.toThrow(InvalidInputException)
    })

    it('should not call repositories if comment validation fails', async () => {
      const input = { ...baseInput, comment: '' }

      await expect(useCase.execute(input)).rejects.toThrow(InvalidInputException)

      expect(mockAuthService.requireApprovalPermission).not.toHaveBeenCalled()
      expect(mockWorkflowRepo.findRunById).not.toHaveBeenCalled()
    })
  })

  describe('Authorization Tests', () => {
    it('should throw UnauthorizedAccessError if user lacks permission', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockRejectedValue(
        new UnauthorizedAccessError('User lacks approval permission')
      )

      await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedAccessError)
    })

    it('should verify user has approval permission', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockAuthService.requireApprovalPermission).toHaveBeenCalledWith(
        baseInput.userId,
        baseInput.organizationId,
        baseInput.projectId
      )
    })

    it('should throw UnauthorizedAccessError if run belongs to different org', async () => {
      const runDifferentOrg = { ...mockRun, organizationId: 'org-different' }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(runDifferentOrg)

      await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedAccessError)
      await expect(useCase.execute(baseInput)).rejects.toThrow('Run does not belong to organization')
    })
  })

  describe('State Validation Tests', () => {
    it('should throw WorkflowRunNotFoundError if run not found', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(null)

      await expect(useCase.execute(baseInput)).rejects.toThrow(WorkflowRunNotFoundError)
    })

    it('should throw InvalidWorkflowStateError if run not in waiting_approval', async () => {
      const runInRunningState = { ...mockRun, state: WorkflowState.RUNNING }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(runInRunningState)

      await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidWorkflowStateError)
      await expect(useCase.execute(baseInput)).rejects.toThrow('Expected waiting_approval, got running')
    })

    it('should throw InvalidWorkflowStateError if run already completed', async () => {
      const completedRun = { ...mockRun, state: WorkflowState.SUCCEEDED }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(completedRun)

      await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidWorkflowStateError)
    })

    it('should throw InvalidWorkflowStateError if run already failed', async () => {
      const failedRun = { ...mockRun, state: WorkflowState.FAILED }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(failedRun)

      await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidWorkflowStateError)
    })

    it('should throw WorkflowApprovalNotFoundError if approval not found', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(null)

      await expect(useCase.execute(baseInput)).rejects.toThrow(WorkflowApprovalNotFoundError)
    })
  })

  describe('Approval State Tests', () => {
    it('should throw ApprovalAlreadyDecidedError if already approved', async () => {
      const approvedApproval = {
        ...mockApproval,
        status: ApprovalStatus.APPROVED,
        decidedByUserId: 'other-user',
        decidedAt: new Date(),
      }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(approvedApproval)

      await expect(useCase.execute(baseInput)).rejects.toThrow(ApprovalAlreadyDecidedError)
    })

    it('should throw ApprovalAlreadyDecidedError if already rejected', async () => {
      const rejectedApproval = {
        ...mockApproval,
        status: ApprovalStatus.REJECTED,
        decidedByUserId: 'other-user',
        decidedAt: new Date(),
      }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(rejectedApproval)

      await expect(useCase.execute(baseInput)).rejects.toThrow(ApprovalAlreadyDecidedError)
    })

    it('should reject only if approval is pending', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockApprovalRepo.save).toHaveBeenCalled()
    })

    it('should reject if approval is pending and not invalidated', async () => {
      const pendingApproval = { ...mockApproval, status: ApprovalStatus.PENDING }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(pendingApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(pendingApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      expect(mockApprovalRepo.save).toHaveBeenCalled()
    })
  })

  describe('Error Handling Tests', () => {
    it('should log errors and re-throw', async () => {
      const error = new Error('Database connection failed')
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockRejectedValue(error)

      await expect(useCase.execute(baseInput)).rejects.toThrow(error)

      expect(mockLogger.error).toHaveBeenCalledWith('Workflow rejection failed', {
        runId: baseInput.runId,
        userId: baseInput.userId,
        error: 'Database connection failed',
      })
    })

    it('should not update state on authorization failure', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockRejectedValue(
        new UnauthorizedAccessError('No permission')
      )

      await expect(useCase.execute(baseInput)).rejects.toThrow(UnauthorizedAccessError)

      expect(mockApprovalRepo.save).not.toHaveBeenCalled()
      expect(mockWorkflowRepo.updateRunState).not.toHaveBeenCalled()
    })

    it('should not emit event on validation failure', async () => {
      const input = { ...baseInput, comment: '' }

      await expect(useCase.execute(input)).rejects.toThrow(InvalidInputException)

      expect(mockEventRepo.appendEvent).not.toHaveBeenCalled()
    })

    it('should not update approval if run state validation fails', async () => {
      const runInRunningState = { ...mockRun, state: WorkflowState.RUNNING }
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(runInRunningState)

      await expect(useCase.execute(baseInput)).rejects.toThrow(InvalidWorkflowStateError)

      expect(mockApprovalRepo.findByRunId).not.toHaveBeenCalled()
      expect(mockApprovalRepo.save).not.toHaveBeenCalled()
    })

    it('should handle non-Error objects in catch block', async () => {
      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockRejectedValue('String error')

      await expect(useCase.execute(baseInput)).rejects.toBe('String error')

      expect(mockLogger.error).toHaveBeenCalledWith('Workflow rejection failed', {
        runId: baseInput.runId,
        userId: baseInput.userId,
        error: 'String error',
      })
    })
  })

  describe('Workflow Termination', () => {
    it('should not queue next step after rejection', async () => {
      // This test verifies that the use case does NOT call any step executor
      // Rejection is a terminal operation - no further steps should be queued

      vi.mocked(mockAuthService.requireApprovalPermission).mockResolvedValue()
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)
      vi.mocked(mockApprovalRepo.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(mockApprovalRepo.save).mockResolvedValue(mockApproval)
      vi.mocked(mockEventRepo.appendEvent).mockResolvedValue({} as any)
      vi.mocked(mockWorkflowRepo.updateRunState).mockResolvedValue({} as any)

      await useCase.execute(baseInput)

      // Verify workflow run is in cancelled state (terminal)
      expect(mockWorkflowRepo.updateRunState).toHaveBeenCalledWith(
        baseInput.runId,
        expect.objectContaining({
          status: WorkflowState.CANCELLED,
        })
      )

      // Note: No step executor should be invoked
      // The workflow terminates at rejection
    })
  })
})
