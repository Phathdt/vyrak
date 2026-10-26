import { ApiProperty } from '@nestjs/swagger'
import { WorkflowState } from '@vyrak/workflow-core'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for listing workflow runs query parameters
 */
export const ListWorkflowRunsSchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(WorkflowState).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * DTO for listing workflow runs with filters and pagination
 * Used by GET /api/workflows/runs
 */
export class ListWorkflowRunsDto extends createZodDto(ListWorkflowRunsSchema) {
  @ApiProperty({
    description: 'Filter by project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    required: false,
  })
  projectId?: string

  @ApiProperty({
    description: 'Filter by workflow state',
    enum: WorkflowState,
    example: WorkflowState.RUNNING,
    required: false,
  })
  status?: WorkflowState

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  page: number

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  limit: number
}
