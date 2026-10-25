import { WorkflowState } from '@vyrak/workflow-core'
import { describe, expect, it } from 'vitest'

import {
  ApprovalDecisionDto,
  ApprovalDecisionSchema,
  CreateWorkflowRunDto,
  CreateWorkflowRunSchema,
  ListWorkflowRunsDto,
  ListWorkflowRunsSchema,
  PaginatedWorkflowRunsDto,
  PaginatedWorkflowRunsSchema,
  WorkflowRunResponseDto,
  WorkflowRunResponseSchema,
  WorkflowRunSummaryDto,
  WorkflowRunSummarySchema,
} from '../index'

describe('Workflow DTOs', () => {
  describe('CreateWorkflowRunDto', () => {
    it('should validate valid input', () => {
      const validData = {
        requirement: 'Implement user authentication with JWT tokens',
        repositoryId: '550e8400-e29b-41d4-a716-446655440000',
        branch: 'main',
      }

      const result = CreateWorkflowRunSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should apply default branch value', () => {
      const data = {
        requirement: 'Implement user authentication',
        repositoryId: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = CreateWorkflowRunSchema.parse(data)
      expect(result.branch).toBe('main')
    })

    it('should reject requirement shorter than 10 characters', () => {
      const invalidData = {
        requirement: 'Short',
        repositoryId: '550e8400-e29b-41d4-a716-446655440000',
        branch: 'main',
      }

      const result = CreateWorkflowRunSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid UUID for repositoryId', () => {
      const invalidData = {
        requirement: 'Implement user authentication',
        repositoryId: 'not-a-uuid',
        branch: 'main',
      }

      const result = CreateWorkflowRunSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty branch name', () => {
      const invalidData = {
        requirement: 'Implement user authentication',
        repositoryId: '550e8400-e29b-41d4-a716-446655440000',
        branch: '',
      }

      const result = CreateWorkflowRunSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept optional idempotencyKey', () => {
      const validData = {
        requirement: 'Implement user authentication',
        repositoryId: '550e8400-e29b-41d4-a716-446655440000',
        branch: 'main',
        idempotencyKey: 'unique-key-12345',
      }

      const result = CreateWorkflowRunSchema.safeParse(validData)
      expect(result.success).toBe(true)
      expect(result.data?.idempotencyKey).toBe('unique-key-12345')
    })
  })

  describe('WorkflowRunResponseDto', () => {
    it('should validate complete workflow run response', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        workflowKey: 'ai-sdlc-workflow',
        workflowVersion: '1.0.0',
        status: WorkflowState.RUNNING,
        currentStepKey: 'planning',
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        idempotencyKey: 'unique-key-12345',
        input: { requirement: 'Test', branch: 'main' },
        startedAt: '2026-10-26T02:30:00Z',
        createdAt: '2026-10-26T02:20:00Z',
        updatedAt: '2026-10-26T02:30:00Z',
      }

      const result = WorkflowRunResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept workflow run with minimal fields', () => {
      const minimalData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        workflowKey: 'ai-sdlc-workflow',
        workflowVersion: '1.0.0',
        status: WorkflowState.QUEUED,
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        createdAt: '2026-10-26T02:20:00Z',
        updatedAt: '2026-10-26T02:20:00Z',
      }

      const result = WorkflowRunResponseSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid workflow state', () => {
      const invalidData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        workflowKey: 'ai-sdlc-workflow',
        workflowVersion: '1.0.0',
        status: 'INVALID_STATE',
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        createdAt: '2026-10-26T02:20:00Z',
        updatedAt: '2026-10-26T02:20:00Z',
      }

      const result = WorkflowRunResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('ListWorkflowRunsDto', () => {
    it('should validate query parameters with defaults', () => {
      const result = ListWorkflowRunsSchema.parse({})

      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should accept valid filters', () => {
      const validData = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        status: WorkflowState.RUNNING,
        page: 2,
        limit: 30,
      }

      const result = ListWorkflowRunsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should coerce string page to number', () => {
      const data = { page: '3' as any }
      const result = ListWorkflowRunsSchema.parse(data)

      expect(result.page).toBe(3)
      expect(typeof result.page).toBe('number')
    })

    it('should reject page less than 1', () => {
      const invalidData = { page: 0 }
      const result = ListWorkflowRunsSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 50', () => {
      const invalidData = { limit: 51 }
      const result = ListWorkflowRunsSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should reject invalid UUID for projectId', () => {
      const invalidData = { projectId: 'not-a-uuid' }
      const result = ListWorkflowRunsSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })
  })

  describe('WorkflowRunSummaryDto', () => {
    it('should validate workflow run summary', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        workflowKey: 'ai-sdlc-workflow',
        status: WorkflowState.RUNNING,
        requirement: 'Implement user authentication',
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        createdAt: '2026-10-26T02:20:00Z',
      }

      const result = WorkflowRunSummarySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional timestamps', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        workflowKey: 'ai-sdlc-workflow',
        status: WorkflowState.SUCCEEDED,
        requirement: 'Implement user authentication',
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        startedAt: '2026-10-26T02:30:00Z',
        completedAt: '2026-10-26T03:00:00Z',
        createdAt: '2026-10-26T02:20:00Z',
      }

      const result = WorkflowRunSummarySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('PaginatedWorkflowRunsDto', () => {
    it('should validate paginated response', () => {
      const validData = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            projectId: '550e8400-e29b-41d4-a716-446655440002',
            workflowKey: 'ai-sdlc-workflow',
            status: WorkflowState.RUNNING,
            requirement: 'Implement user authentication',
            initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
            createdAt: '2026-10-26T02:20:00Z',
          },
        ],
        total: 42,
        page: 1,
        limit: 20,
        totalPages: 3,
      }

      const result = PaginatedWorkflowRunsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty items array', () => {
      const validData = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }

      const result = PaginatedWorkflowRunsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('ApprovalDecisionDto', () => {
    it('should validate approval decision with comment', () => {
      const validData = {
        comment: 'Approved after reviewing the implementation plan',
      }

      const result = ApprovalDecisionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty approval decision', () => {
      const validData = {}

      const result = ApprovalDecisionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject comment exceeding 5000 characters', () => {
      const invalidData = {
        comment: 'x'.repeat(5001),
      }

      const result = ApprovalDecisionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept comment at exactly 5000 characters', () => {
      const validData = {
        comment: 'x'.repeat(5000),
      }

      const result = ApprovalDecisionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
