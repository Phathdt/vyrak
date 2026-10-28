import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

export const WorkflowEventResponseSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  sequence: z.number().int().min(0),
  createdAt: z.string().datetime(),
})

export class WorkflowEventResponseDto extends createZodDto(WorkflowEventResponseSchema) {
  @ApiProperty({ description: 'Event ID' })
  id!: string

  @ApiProperty({ description: 'Workflow run ID' })
  runId!: string

  @ApiProperty({ description: 'Event type' })
  eventType!: string

  @ApiProperty({
    description: 'Event payload (sensitive data redacted)',
    type: 'object',
    additionalProperties: true,
  })
  payload!: Record<string, unknown>

  @ApiProperty({ description: 'Event sequence number' })
  sequence!: number

  @ApiProperty({ description: 'Event creation timestamp' })
  createdAt!: string
}
