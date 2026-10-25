import { NotFoundException } from '@nestjs/common'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IWorkflowRepository, WorkflowRun, WorkflowState } from '../../../domain'
import { CancelWorkflowUseCase } from '../cancel-workflow.use-case'

describe('CancelWorkflowUseCase', () => {
  let useCase: CancelWorkflowUseCase
  let mockWorkflowRepo: IWorkflowRepository

  const mockRun: WorkflowRun = {
    id: 'run-123',
    workflowKey: 'ai-sdlc-workflow',
    workflowVersion: '1.0.0',
    organizationId: 'org-123',
    projectId: 'project-123',
    state: WorkflowState.RUNNING,
    currentStepKey: 'coding',
    initiatedByUserId: 'user-123',
    createdAt: new Date('2026-10-26T02:00:00Z'),
    updatedAt: new Date('2026-10-26T02:30:00Z'),
  }

  beforeEach(() => {
    mockWorkflowRepo = {
      findRunById: vi.fn(),
      updateRunState: vi.fn(),
      createRun: vi.fn(),
      findRunByIdempotencyKey: vi.fn(),
      findRunsWithCount: vi.fn(),
      cancelRun: vi.fn(),
      acquireLease: vi.fn(),
      renewLease: vi.fn(),
      releaseLease: vi.fn(),
      updateHeartbeat: vi.fn(),
      findExpiredLeases: vi.fn(),
    }

    useCase = new CancelWorkflowUseCase(mockWorkflowRepo)
  })

  describe('execute', () => {
    it('should cancel a running workflow successfully', async () => {
      const cancelledRun = { ...mockRun, state: WorkflowState.CANCELLED }

      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValueOnce(mockRun).mockResolvedValueOnce(cancelledRun)

      const result = await useCase.execute({
        runId: 'run-123',
        userId: 'user-456',
        organizationId: 'org-123',
        projectId: 'project-123',
        reason: 'No longer needed',
      })

      expect(mockWorkflowRepo.findRunById).toHaveBeenCalledWith('run-123')
      expect(mockWorkflowRepo.updateRunState).toHaveBeenCalledWith('run-123', {
        status: WorkflowState.CANCELLED,
        cancellationReason: 'No longer needed',
        cancelledByUserId: 'user-456',
        cancelledAt: expect.any(Date),
      })
      expect(result.state).toBe(WorkflowState.CANCELLED)
    })

    it('should use default reason when not provided', async () => {
      const cancelledRun = { ...mockRun, state: WorkflowState.CANCELLED }

      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValueOnce(mockRun).mockResolvedValueOnce(cancelledRun)

      await useCase.execute({
        runId: 'run-123',
        userId: 'user-456',
        organizationId: 'org-123',
        projectId: 'project-123',
      })

      expect(mockWorkflowRepo.updateRunState).toHaveBeenCalledWith('run-123', {
        status: WorkflowState.CANCELLED,
        cancellationReason: 'User requested cancellation',
        cancelledByUserId: 'user-456',
        cancelledAt: expect.any(Date),
      })
    })

    it('should throw NotFoundException when workflow run not found', async () => {
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(null)

      await expect(
        useCase.execute({
          runId: 'run-999',
          userId: 'user-456',
          organizationId: 'org-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when organizationId does not match', async () => {
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)

      await expect(
        useCase.execute({
          runId: 'run-123',
          userId: 'user-456',
          organizationId: 'org-999', // Wrong org
          projectId: 'project-123',
        })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when projectId does not match', async () => {
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(mockRun)

      await expect(
        useCase.execute({
          runId: 'run-123',
          userId: 'user-456',
          organizationId: 'org-123',
          projectId: 'project-999', // Wrong project
        })
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw error when workflow is already completed', async () => {
      const completedRun = { ...mockRun, state: WorkflowState.SUCCEEDED }
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(completedRun)

      await expect(
        useCase.execute({
          runId: 'run-123',
          userId: 'user-456',
          organizationId: 'org-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow('Workflow in state succeeded cannot be cancelled')
    })

    it('should throw error when workflow is already cancelled', async () => {
      const cancelledRun = { ...mockRun, state: WorkflowState.CANCELLED }
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(cancelledRun)

      await expect(
        useCase.execute({
          runId: 'run-123',
          userId: 'user-456',
          organizationId: 'org-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow('Workflow in state cancelled cannot be cancelled')
    })

    it('should throw error when workflow has failed', async () => {
      const failedRun = { ...mockRun, state: WorkflowState.FAILED }
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(failedRun)

      await expect(
        useCase.execute({
          runId: 'run-123',
          userId: 'user-456',
          organizationId: 'org-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow('Workflow in state failed cannot be cancelled')
    })

    it('should throw error when workflow is rejected', async () => {
      const cancelledRun = { ...mockRun, state: WorkflowState.CANCELLED }
      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValue(cancelledRun)

      await expect(
        useCase.execute({
          runId: 'run-123',
          userId: 'user-456',
          organizationId: 'org-123',
          projectId: 'project-123',
        })
      ).rejects.toThrow('Workflow in state cancelled cannot be cancelled')
    })

    it('should successfully cancel workflow in QUEUED state', async () => {
      const queuedRun = { ...mockRun, state: WorkflowState.QUEUED }
      const cancelledRun = { ...queuedRun, state: WorkflowState.CANCELLED }

      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValueOnce(queuedRun).mockResolvedValueOnce(cancelledRun)

      const result = await useCase.execute({
        runId: 'run-123',
        userId: 'user-456',
        organizationId: 'org-123',
        projectId: 'project-123',
      })

      expect(result.state).toBe(WorkflowState.CANCELLED)
    })

    it('should successfully cancel workflow in WAITING_APPROVAL state', async () => {
      const waitingRun = { ...mockRun, state: WorkflowState.WAITING_APPROVAL }
      const cancelledRun = { ...waitingRun, state: WorkflowState.CANCELLED }

      vi.mocked(mockWorkflowRepo.findRunById).mockResolvedValueOnce(waitingRun).mockResolvedValueOnce(cancelledRun)

      const result = await useCase.execute({
        runId: 'run-123',
        userId: 'user-456',
        organizationId: 'org-123',
        projectId: 'project-123',
      })

      expect(result.state).toBe(WorkflowState.CANCELLED)
    })
  })
})
