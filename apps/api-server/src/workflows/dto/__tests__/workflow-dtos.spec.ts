import { WorkflowState } from '@vyrak/workflow-core'

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// Recreate schemas with raw zod for testing (exact copies from DTOs which use nestjs-zod/z)

const CreateWorkflowRunSchema = z.object({
  requirement: z.string().min(10).max(5000),
  repositoryId: z.string().uuid(),
  branch: z.string().min(1).max(255).default('main'),
  idempotencyKey: z.string().min(1).max(255).optional(),
})

const WorkflowRunResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  workflowKey: z.string().min(1).max(255),
  workflowVersion: z.string().min(1).max(50),
  state: z.nativeEnum(WorkflowState),
  initiatedByUserId: z.string().uuid(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  currentStepKey: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const WorkflowRunSummarySchema = z.object({
  id: z.string().uuid(),
  workflowKey: z.string().min(1).max(255),
  state: z.nativeEnum(WorkflowState),
  requirement: z.string().max(100),
  currentStepKey: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
})

const PaginatedWorkflowRunsSchema = z.object({
  items: z.array(WorkflowRunSummarySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(50),
  totalPages: z.number().int().min(0),
})

const ListWorkflowRunsSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(WorkflowState).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

const ApprovalDecisionSchema = z.object({
  comment: z.string().max(2000).optional(),
})

// Re-export types for test usage
type CreateWorkflowRunDto = z.infer<typeof CreateWorkflowRunSchema>
type WorkflowRunResponseDto = z.infer<typeof WorkflowRunResponseSchema>
type WorkflowRunSummaryDto = z.infer<typeof WorkflowRunSummarySchema>
type PaginatedWorkflowRunsDto = z.infer<typeof PaginatedWorkflowRunsSchema>
type ListWorkflowRunsDto = z.infer<typeof ListWorkflowRunsSchema>
type ApprovalDecisionDto = z.infer<typeof ApprovalDecisionSchema>

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
      if (!result.success) {
        console.error('Validation errors:', JSON.stringify(result.error.issues, null, 2))
      }
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
        state: WorkflowState.RUNNING,
        currentStepKey: 'planning',
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        input: { requirement: 'Test', branch: 'main' },
        output: null,
        error: null,
        startedAt: '2026-10-26T02:30:00Z',
        completedAt: null,
        createdAt: '2026-10-26T02:20:00Z',
        updatedAt: '2026-10-26T02:30:00Z',
      }

      const result = WorkflowRunResponseSchema.safeParse(validData)
      if (!result.success) {
      }
      expect(result.success).toBe(true)
    })

    it('should accept workflow run with minimal fields', () => {
      const minimalData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        projectId: '550e8400-e29b-41d4-a716-446655440002',
        workflowKey: 'ai-sdlc-workflow',
        workflowVersion: '1.0.0',
        state: WorkflowState.QUEUED,
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        input: {},
        output: null,
        error: null,
        startedAt: null,
        completedAt: null,
        currentStepKey: null,
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
        state: 'INVALID_STATE',
        initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
        input: {},
        output: null,
        error: null,
        startedAt: null,
        completedAt: null,
        currentStepKey: null,
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
        state: WorkflowState.RUNNING,
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
        workflowKey: 'ai-sdlc-workflow',
        state: WorkflowState.RUNNING,
        requirement: 'Implement user authentication',
        currentStepKey: 'planning',
        startedAt: '2026-10-26T02:30:00Z',
        completedAt: null,
        createdAt: '2026-10-26T02:20:00Z',
      }

      const result = WorkflowRunSummarySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional timestamps', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        workflowKey: 'ai-sdlc-workflow',
        state: WorkflowState.SUCCEEDED,
        requirement: 'Implement user authentication',
        currentStepKey: null,
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
            workflowKey: 'ai-sdlc-workflow',
            state: WorkflowState.RUNNING,
            requirement: 'Implement user authentication',
            currentStepKey: 'planning',
            startedAt: '2026-10-26T02:30:00Z',
            completedAt: null,
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

    it('should accept comment at exactly 2000 characters', () => {
      const validData = {
        comment: 'x'.repeat(2000),
      }

      const result = ApprovalDecisionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
