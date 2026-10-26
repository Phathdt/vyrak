import { ApiPropertyOptional } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

export const ListEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export class ListEventsQueryDto extends createZodDto(ListEventsQuerySchema) {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Number of events to return' })
  limit!: number

  @ApiPropertyOptional({ default: 0, minimum: 0, description: 'Number of events to skip' })
  offset!: number
}
