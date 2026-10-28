import { ApiProperty } from '@nestjs/swagger'
import { WorkflowState } from '@vyrak/workflow-core'
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for workflow run response
 */
export const WorkflowRunResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  workflowKey: z.string(),
  workflowVersion: z.string(),
  status: z.nativeEnum(WorkflowState),
  currentStepKey: z.string().optional(),
  initiatedByUserId: z.string().uuid(),
  idempotencyKey: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancelledByUserId: z.string().uuid().optional(),
  cancellationReason: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * DTO for workflow run response
 * Used by GET /api/workflows/runs/:runId
 */
export class WorkflowRunResponseDto extends createZodDto(WorkflowRunResponseSchema) {
  @ApiProperty({
    description: 'Unique workflow run ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string

  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  organizationId: string

  @ApiProperty({
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
    format: 'uuid',
  })
  projectId: string

  @ApiProperty({
    description: 'Workflow key identifier',
    example: 'ai-sdlc-workflow',
  })
  workflowKey: string

  @ApiProperty({
    description: 'Workflow version (semver)',
    example: '1.0.0',
  })
  workflowVersion: string

  @ApiProperty({
    description: 'Current workflow state',
    enum: WorkflowState,
    example: WorkflowState.RUNNING,
  })
  status: WorkflowState

  @ApiProperty({
    description: 'Current step key if workflow is in progress',
    example: 'planning',
    required: false,
  })
  currentStepKey?: string

  @ApiProperty({
    description: 'User ID who initiated the workflow',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
  })
  initiatedByUserId: string

  @ApiProperty({
    description: 'Idempotency key if provided',
    example: 'unique-key-12345',
    required: false,
  })
  idempotencyKey?: string

  @ApiProperty({
    description: 'Workflow input data',
    example: { requirement: 'Implement user authentication', branch: 'main' },
    required: false,
  })
  input?: Record<string, unknown>

  @ApiProperty({
    description: 'Timestamp when workflow started execution',
    example: '2026-10-26T02:30:00Z',
    format: 'date-time',
    required: false,
  })
  startedAt?: string

  @ApiProperty({
    description: 'Timestamp when workflow succeeded/failed',
    example: '2026-10-26T03:00:00Z',
    format: 'date-time',
    required: false,
  })
  completedAt?: string

  @ApiProperty({
    description: 'Timestamp when workflow was cancelled',
    example: '2026-10-26T02:45:00Z',
    format: 'date-time',
    required: false,
  })
  cancelledAt?: string

  @ApiProperty({
    description: 'User ID who cancelled the workflow',
    example: '550e8400-e29b-41d4-a716-446655440004',
    format: 'uuid',
    required: false,
  })
  cancelledByUserId?: string

  @ApiProperty({
    description: 'Reason for workflow cancellation',
    example: 'User requested cancellation',
    required: false,
  })
  cancellationReason?: string

  @ApiProperty({
    description: 'Error code if workflow failed',
    example: 'EXEC_TIMEOUT',
    required: false,
  })
  errorCode?: string

  @ApiProperty({
    description: 'Error message if workflow failed',
    example: 'Workflow execution timed out after 30 minutes',
    required: false,
  })
  errorMessage?: string

  @ApiProperty({
    description: 'Timestamp when workflow run was created',
    example: '2026-10-26T02:20:00Z',
    format: 'date-time',
  })
  createdAt: string

  @ApiProperty({
    description: 'Timestamp when workflow run was last updated',
    example: '2026-10-26T02:30:00Z',
    format: 'date-time',
  })
  updatedAt: string
}
