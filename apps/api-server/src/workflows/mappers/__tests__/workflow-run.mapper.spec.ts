import { WorkflowRun, WorkflowState } from '@vyrak/workflow-core'
import { describe, expect, it } from 'vitest'

import {
  toWorkflowRunResponseDto,
  toWorkflowRunSummaryDto,
} from '../workflow-run.mapper'

describe('WorkflowRunMapper', () => {
  const mockWorkflowRun: WorkflowRun = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    workflowKey: 'ai-sdlc-workflow',
    workflowVersion: '1.0.0',
    organizationId: '550e8400-e29b-41d4-a716-446655440001',
    projectId: '550e8400-e29b-41d4-a716-446655440002',
    state: WorkflowState.RUNNING,
    currentStepKey: 'planning',
    initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
    idempotencyKey: 'unique-key-12345',
    input: { requirement: 'Implement user authentication', branch: 'main' },
    startedAt: new Date('2026-10-26T02:30:00Z'),
    completedAt: undefined,
    cancelledAt: undefined,
    cancelledByUserId: undefined,
    cancellationReason: undefined,
    errorCode: undefined,
    errorMessage: undefined,
    createdAt: new Date('2026-10-26T02:20:00Z'),
    updatedAt: new Date('2026-10-26T02:30:00Z'),
  }

  describe('toWorkflowRunResponseDto', () => {
    it('should map WorkflowRun to WorkflowRunResponseDto with all fields', () => {
      const dto = toWorkflowRunResponseDto(mockWorkflowRun)

      expect(dto).toEqual({
        id: mockWorkflowRun.id,
        organizationId: mockWorkflowRun.organizationId,
        projectId: mockWorkflowRun.projectId,
        workflowKey: mockWorkflowRun.workflowKey,
        workflowVersion: mockWorkflowRun.workflowVersion,
        status: mockWorkflowRun.state,
        currentStepKey: mockWorkflowRun.currentStepKey,
        initiatedByUserId: mockWorkflowRun.initiatedByUserId,
        idempotencyKey: mockWorkflowRun.idempotencyKey,
        input: mockWorkflowRun.input,
        startedAt: '2026-10-26T02:30:00.000Z',
        completedAt: undefined,
        cancelledAt: undefined,
        cancelledByUserId: undefined,
        cancellationReason: undefined,
        errorCode: undefined,
        errorMessage: undefined,
        createdAt: '2026-10-26T02:20:00.000Z',
        updatedAt: '2026-10-26T02:30:00.000Z',
      })
    })

    it('should handle completed workflow with timestamps', () => {
      const completedRun: WorkflowRun = {
        ...mockWorkflowRun,
        state: WorkflowState.SUCCEEDED,
        completedAt: new Date('2026-10-26T03:00:00Z'),
      }

      const dto = toWorkflowRunResponseDto(completedRun)

      expect(dto.status).toBe(WorkflowState.SUCCEEDED)
      expect(dto.completedAt).toBe('2026-10-26T03:00:00.000Z')
    })

    it('should handle cancelled workflow with cancellation details', () => {
      const cancelledRun: WorkflowRun = {
        ...mockWorkflowRun,
        state: WorkflowState.CANCELLED,
        cancelledAt: new Date('2026-10-26T02:45:00Z'),
        cancelledByUserId: '550e8400-e29b-41d4-a716-446655440004',
        cancellationReason: 'User requested cancellation',
      }

      const dto = toWorkflowRunResponseDto(cancelledRun)

      expect(dto.status).toBe(WorkflowState.CANCELLED)
      expect(dto.cancelledAt).toBe('2026-10-26T02:45:00.000Z')
      expect(dto.cancelledByUserId).toBe('550e8400-e29b-41d4-a716-446655440004')
      expect(dto.cancellationReason).toBe('User requested cancellation')
    })

    it('should handle failed workflow with error details', () => {
      const failedRun: WorkflowRun = {
        ...mockWorkflowRun,
        state: WorkflowState.FAILED,
        errorCode: 'EXEC_TIMEOUT',
        errorMessage: 'Workflow execution timed out after 30 minutes',
      }

      const dto = toWorkflowRunResponseDto(failedRun)

      expect(dto.status).toBe(WorkflowState.FAILED)
      expect(dto.errorCode).toBe('EXEC_TIMEOUT')
      expect(dto.errorMessage).toBe('Workflow execution timed out after 30 minutes')
    })
  })

  describe('toWorkflowRunSummaryDto', () => {
    it('should map WorkflowRun to WorkflowRunSummaryDto with requirement', () => {
      const requirement = 'Implement user authentication with JWT tokens'
      const dto = toWorkflowRunSummaryDto(mockWorkflowRun, requirement)

      expect(dto).toEqual({
        id: mockWorkflowRun.id,
        projectId: mockWorkflowRun.projectId,
        workflowKey: mockWorkflowRun.workflowKey,
        status: mockWorkflowRun.state,
        requirement,
        initiatedByUserId: mockWorkflowRun.initiatedByUserId,
        startedAt: '2026-10-26T02:30:00.000Z',
        completedAt: undefined,
        createdAt: '2026-10-26T02:20:00.000Z',
      })
    })

    it('should truncate requirement to 100 characters', () => {
      const longRequirement =
        'This is a very long requirement that exceeds one hundred characters and should be truncated properly with extra text'
      const dto = toWorkflowRunSummaryDto(mockWorkflowRun, longRequirement)

      expect(dto.requirement).toBe('This is a very long requirement that exceeds one hundred characters and should be truncated prope...')
      expect(dto.requirement.length).toBe(100)
    })

    it('should not truncate short requirements', () => {
      const shortRequirement = 'Short requirement'
      const dto = toWorkflowRunSummaryDto(mockWorkflowRun, shortRequirement)

      expect(dto.requirement).toBe(shortRequirement)
    })

    it('should handle workflow without optional timestamps', () => {
      const queuedRun: WorkflowRun = {
        ...mockWorkflowRun,
        state: WorkflowState.QUEUED,
        startedAt: undefined,
        completedAt: undefined,
      }

      const dto = toWorkflowRunSummaryDto(queuedRun, 'Test requirement')

      expect(dto.startedAt).toBeUndefined()
      expect(dto.completedAt).toBeUndefined()
    })
  })
})
