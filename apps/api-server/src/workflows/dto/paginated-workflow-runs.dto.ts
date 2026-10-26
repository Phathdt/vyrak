import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

import { WorkflowRunSummaryDto, WorkflowRunSummarySchema } from './workflow-run-summary.dto'

/**
 * Zod schema for paginated workflow runs response
 */
export const PaginatedWorkflowRunsSchema = z.object({
  items: z.array(WorkflowRunSummarySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
})

/**
 * DTO for paginated workflow runs response
 * Used by GET /api/workflows/runs
 */
export class PaginatedWorkflowRunsDto extends createZodDto(PaginatedWorkflowRunsSchema) {
  @ApiProperty({
    description: 'Array of workflow run summaries',
    type: [WorkflowRunSummaryDto],
  })
  items: WorkflowRunSummaryDto[]

  @ApiProperty({
    description: 'Total number of workflow runs matching the filter',
    example: 42,
  })
  total: number

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number
}
