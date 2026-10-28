import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

import { WorkflowEventResponseDto, WorkflowEventResponseSchema } from './workflow-event-response.dto'

export const PaginatedEventsResponseSchema = z.object({
  items: z.array(WorkflowEventResponseSchema),
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
})

export class PaginatedEventsResponseDto extends createZodDto(PaginatedEventsResponseSchema) {
  @ApiProperty({ type: [WorkflowEventResponseDto], description: 'List of events' })
  items!: WorkflowEventResponseDto[]

  @ApiProperty({ description: 'Total number of events' })
  total!: number

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number

  @ApiProperty({ description: 'Offset from start' })
  offset!: number
}
