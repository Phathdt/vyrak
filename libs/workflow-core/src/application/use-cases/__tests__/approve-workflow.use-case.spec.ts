import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowState } from '../../../domain'
import { WorkflowRun } from '../../../domain/entities'
import { WorkflowApprovalEntity } from '../../../domain/entities/workflow-approval.entity'
import {
  ApprovalAlreadyDecidedError,
  StaleApprovalError,
  UnauthorizedAccessError,
  WorkflowApprovalNotFoundError,
  WorkflowRunNotFoundError,
} from '../../../domain/errors'
import { InvalidWorkflowStateError } from '../../../domain/errors/invalid-workflow-state.error'
import { ApprovalValidatorService } from '../../services/approval-validator.service'
import { ApproveWorkflowInput, ApproveWorkflowUseCase } from '../approve-workflow.use-case'

import type { IAuthorizationService } from '../../../domain/interfaces/authorization.interface'
import type { IEventRepository } from '../../../domain/interfaces/event.repository.interface'
import type { IJobQueue } from '../../../domain/interfaces/job-queue.interface'
import type { IWorkflowApprovalRepository } from '../../../domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository } from '../../../domain/interfaces/workflow.repository.interface'

describe('ApproveWorkflowUseCase', () => {
  let useCase: ApproveWorkflowUseCase
  let workflowRunRepository: IWorkflowRepository
  let workflowApprovalRepository: IWorkflowApprovalRepository
  let approvalValidator: ApprovalValidatorService
  let authorizationService: IAuthorizationService
  let eventRepository: IEventRepository
  let jobQueue: IJobQueue

  const mockRun: WorkflowRun = {
    id: 'run-123',
    workflowKey: 'claude-workflow',
    workflowVersion: '1.0.0',
    organizationId: 'org-456',
    projectId: 'proj-789',
    state: WorkflowState.WAITING_APPROVAL,
    initiatedByUserId: 'user-111',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockApproval: WorkflowApprovalEntity = {
    id: 'approval-123',
    workflowRunId: 'run-123',
    status: 'pending',
    planArtifactId: 'artifact-123',
    planArtifactHash: 'hash-abc',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockInput: ApproveWorkflowInput = {
    runId: 'run-123',
    userId: 'user-reviewer',
    organizationId: 'org-456',
    projectId: 'proj-789',
    comment: 'Looks good!',
  }

  beforeEach(() => {
    // Mock repositories and services
    workflowRunRepository = {
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
    } as unknown as IWorkflowRepository

    workflowApprovalRepository = {
      findByRunId: vi.fn(),
      save: vi.fn(),
    } as unknown as IWorkflowApprovalRepository

    approvalValidator = {
      validatePlanVersion: vi.fn(),
    } as unknown as ApprovalValidatorService

    authorizationService = {
      requireApprovalPermission: vi.fn(),
    } as unknown as IAuthorizationService

    eventRepository = {
      appendEvent: vi.fn(),
    } as unknown as IEventRepository

    jobQueue = {
      enqueueWorkflowJob: vi.fn(),
    } as unknown as IJobQueue

    useCase = new ApproveWorkflowUseCase(
      workflowRunRepository,
      workflowApprovalRepository,
      approvalValidator,
      authorizationService,
      eventRepository,
      jobQueue
    )
  })

  describe('Happy Path', () => {
    it('should approve pending workflow and transition to running', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(mockInput)

      // Assert
      expect(authorizationService.requireApprovalPermission).toHaveBeenCalledWith(
        mockInput.userId,
        mockInput.organizationId,
        mockInput.projectId
      )
      expect(workflowRunRepository.findRunById).toHaveBeenCalledWith(mockInput.runId)
      expect(workflowApprovalRepository.findByRunId).toHaveBeenCalledWith(mockInput.runId)
      expect(approvalValidator.validatePlanVersion).toHaveBeenCalledWith(mockApproval.id, mockApproval.planArtifactId)
      expect(workflowApprovalRepository.save).toHaveBeenCalled()
      expect(workflowRunRepository.updateRunState).toHaveBeenCalledWith(mockInput.runId, {
        status: WorkflowState.RUNNING,
      })
      expect(jobQueue.enqueueWorkflowJob).toHaveBeenCalledWith(mockRun.id, mockRun.organizationId)
    })

    it('should emit approval_decided event with correct payload', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(mockInput)

      // Assert
      expect(eventRepository.appendEvent).toHaveBeenCalledWith({
        runId: mockInput.runId,
        organizationId: mockInput.organizationId,
        eventType: 'approval_decided',
        payload: expect.objectContaining({
          runId: mockInput.runId,
          projectId: mockRun.projectId,
          organizationId: mockInput.organizationId,
          approvalId: mockApproval.id,
          decision: 'approved',
          decidedByUserId: mockInput.userId,
          decidedAt: expect.any(String),
          comment: mockInput.comment,
        }),
      })
    })

    it('should queue next step after approval', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(mockInput)

      // Assert
      expect(jobQueue.enqueueWorkflowJob).toHaveBeenCalledWith(mockRun.id, mockRun.organizationId)
    })

    it('should store comment when provided', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(mockInput)

      // Assert
      const savedApproval = vi.mocked(workflowApprovalRepository.save).mock.calls[0][0]
      expect(savedApproval.comment).toBe(mockInput.comment)
    })
  })

  describe('Authorization', () => {
    it('should throw UnauthorizedAccessError if user lacks permission', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockRejectedValue(
        new UnauthorizedAccessError('User lacks reviewer role')
      )

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(UnauthorizedAccessError)
      expect(workflowRunRepository.findRunById).not.toHaveBeenCalled()
    })

    it('should verify run belongs to organization', async () => {
      // Arrange
      const runFromDifferentOrg = { ...mockRun, organizationId: 'other-org' }
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(runFromDifferentOrg)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(UnauthorizedAccessError)
      await expect(useCase.execute(mockInput)).rejects.toThrow('Run does not belong to organization')
    })
  })

  describe('State Validation', () => {
    it('should throw InvalidWorkflowStateError if run not waiting_approval', async () => {
      // Arrange
      const runningRun = { ...mockRun, state: WorkflowState.RUNNING }
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(runningRun)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(InvalidWorkflowStateError)
      await expect(useCase.execute(mockInput)).rejects.toThrow('Expected waiting_approval, got running')
    })

    it('should throw WorkflowRunNotFoundError if run not found', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(null)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(WorkflowRunNotFoundError)
    })

    it('should throw WorkflowApprovalNotFoundError if approval not found', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(null)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(WorkflowApprovalNotFoundError)
    })
  })

  describe('Approval State', () => {
    it('should throw ApprovalAlreadyDecidedError if already approved by different user', async () => {
      // Arrange
      const approvedByOther: WorkflowApprovalEntity = {
        ...mockApproval,
        status: 'approved',
        decidedByUserId: 'other-user',
        decidedAt: new Date(),
      }
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(approvedByOther)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(ApprovalAlreadyDecidedError)
    })

    it('should be idempotent if same user approves twice', async () => {
      // Arrange
      const alreadyApproved: WorkflowApprovalEntity = {
        ...mockApproval,
        status: 'approved',
        decidedByUserId: mockInput.userId,
        decidedAt: new Date(),
      }
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(alreadyApproved)

      // Act
      await useCase.execute(mockInput)

      // Assert - should return without error and not update anything
      expect(workflowApprovalRepository.save).not.toHaveBeenCalled()
      expect(eventRepository.appendEvent).not.toHaveBeenCalled()
      expect(workflowRunRepository.updateRunState).not.toHaveBeenCalled()
      expect(jobQueue.enqueueWorkflowJob).not.toHaveBeenCalled()
    })

    it('should reject if approval already rejected', async () => {
      // Arrange
      const rejectedApproval: WorkflowApprovalEntity = {
        ...mockApproval,
        status: 'rejected',
        decidedByUserId: 'other-user',
        decidedAt: new Date(),
      }
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(rejectedApproval)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(ApprovalAlreadyDecidedError)
    })
  })

  describe('Plan Version Validation', () => {
    it('should throw StaleApprovalError if plan regenerated', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(false)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(StaleApprovalError)
      await expect(useCase.execute(mockInput)).rejects.toThrow(
        'Plan has been regenerated or modified, approval is no longer valid'
      )
    })

    it('should use ApprovalValidatorService to check plan version', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(mockInput)

      // Assert
      expect(approvalValidator.validatePlanVersion).toHaveBeenCalledWith(mockApproval.id, mockApproval.planArtifactId)
    })
  })

  describe('Error Handling', () => {
    it('should log errors and re-throw', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockRejectedValue(error)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(error)
    })

    it('should not update state on authorization failure', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockRejectedValue(
        new UnauthorizedAccessError('Permission denied')
      )

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow()
      expect(workflowApprovalRepository.save).not.toHaveBeenCalled()
      expect(eventRepository.appendEvent).not.toHaveBeenCalled()
      expect(workflowRunRepository.updateRunState).not.toHaveBeenCalled()
    })

    it('should not queue next step on failure', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(false)

      // Act & Assert
      await expect(useCase.execute(mockInput)).rejects.toThrow(StaleApprovalError)
      expect(jobQueue.enqueueWorkflowJob).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing comment gracefully', async () => {
      // Arrange
      const inputWithoutComment = { ...mockInput, comment: undefined }
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(inputWithoutComment)

      // Assert
      const savedApproval = vi.mocked(workflowApprovalRepository.save).mock.calls[0][0]
      expect(savedApproval.comment).toBeUndefined()
    })

    it('should set decidedByUserId and decidedAt on approval', async () => {
      // Arrange
      vi.mocked(authorizationService.requireApprovalPermission).mockResolvedValue(undefined)
      vi.mocked(workflowRunRepository.findRunById).mockResolvedValue(mockRun)
      vi.mocked(workflowApprovalRepository.findByRunId).mockResolvedValue(mockApproval)
      vi.mocked(approvalValidator.validatePlanVersion).mockResolvedValue(true)
      vi.mocked(workflowApprovalRepository.save).mockResolvedValue(undefined)
      vi.mocked(eventRepository.appendEvent).mockResolvedValue({} as any)
      vi.mocked(workflowRunRepository.updateRunState).mockResolvedValue(undefined)
      vi.mocked(jobQueue.enqueueWorkflowJob).mockResolvedValue(undefined)

      // Act
      await useCase.execute(mockInput)

      // Assert
      const savedApproval = vi.mocked(workflowApprovalRepository.save).mock.calls[0][0]
      expect(savedApproval.decidedByUserId).toBe(mockInput.userId)
      expect(savedApproval.decidedAt).toBeInstanceOf(Date)
      expect(savedApproval.status).toBe('approved')
    })
  })
})
