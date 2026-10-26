import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const StepRunResponseSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepKey: z.string(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
  attempt: z.number().int().min(0),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable(),
  outputArtifactId: z.string().uuid().nullable(),
})

export class StepRunResponseDto extends createZodDto(StepRunResponseSchema) {
  @ApiProperty({ description: 'Step execution ID' })
  id!: string

  @ApiProperty({ description: 'Workflow run ID' })
  runId!: string

  @ApiProperty({ description: 'Step key in workflow definition' })
  stepKey!: string

  @ApiProperty({
    enum: ['pending', 'running', 'succeeded', 'failed', 'skipped'],
    description: 'Step execution status',
  })
  status!: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

  @ApiProperty({ description: 'Attempt number (0-based)' })
  attempt!: number

  @ApiProperty({ type: String, nullable: true, description: 'Step start timestamp' })
  startedAt!: string | null

  @ApiProperty({ type: String, nullable: true, description: 'Step completion timestamp' })
  completedAt!: string | null

  @ApiProperty({ type: String, nullable: true, description: 'Error message if step failed' })
  errorMessage!: string | null

  @ApiProperty({ type: String, nullable: true, description: 'Output artifact ID if available' })
  outputArtifactId!: string | null
}
