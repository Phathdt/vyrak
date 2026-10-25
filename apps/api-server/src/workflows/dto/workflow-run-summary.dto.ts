import { ApiProperty } from '@nestjs/swagger'

import { WorkflowState } from '@vyrak/workflow-core'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Zod schema for workflow run summary (lightweight version for list responses)
 */
export const WorkflowRunSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  workflowKey: z.string(),
  status: z.nativeEnum(WorkflowState),
  requirement: z.string(),
  initiatedByUserId: z.string().uuid(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
})

/**
 * DTO for workflow run summary (lightweight version)
 * Used in paginated list responses
 */
export class WorkflowRunSummaryDto extends createZodDto(WorkflowRunSummarySchema) {
  @ApiProperty({
    description: 'Unique workflow run ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id: string

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
    description: 'Current workflow state',
    enum: WorkflowState,
    example: WorkflowState.RUNNING,
  })
  status: WorkflowState

  @ApiProperty({
    description: 'Workflow requirement (truncated to 100 characters)',
    example: 'Implement user authentication with JWT tokens',
  })
  requirement: string

  @ApiProperty({
    description: 'User ID who initiated the workflow',
    example: '550e8400-e29b-41d4-a716-446655440003',
    format: 'uuid',
  })
  initiatedByUserId: string

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
    description: 'Timestamp when workflow run was created',
    example: '2026-10-26T02:20:00Z',
    format: 'date-time',
  })
  createdAt: string
}
