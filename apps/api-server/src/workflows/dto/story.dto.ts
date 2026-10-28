import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for story response
 */
export const StorySchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  title: z.string(),
  description: z.string().nullable().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  estimatedDuration: z.number().int().nullable().optional(),
  status: z.enum(['queued', 'in_progress', 'completed', 'failed', 'skipped', 'paused']),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  error: z.string().nullable().optional(),
  artifacts: z.record(z.unknown()).nullable().optional(),
  subSteps: z.array(z.unknown()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * DTO for story response
 * Used by GET /api/organizations/:orgId/workflows/:runId/stories
 */
export class StoryDto extends createZodDto(StorySchema) {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string

  @ApiProperty({
    description: 'Workflow run ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  workflowRunId: string

  @ApiProperty({
    description: 'Order index (0-based)',
    example: 0,
  })
  orderIndex: number

  @ApiProperty({
    description: 'Story title',
    example: 'Implement user authentication',
  })
  title: string

  @ApiProperty({
    description: 'Story description',
    example: 'Implement JWT-based authentication for user login',
    nullable: true,
  })
  description?: string | null

  @ApiProperty({
    description: 'Acceptance criteria',
    type: [String],
    example: ['User can login', 'JWT token is returned'],
  })
  acceptanceCriteria?: string[]

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 30,
    nullable: true,
  })
  estimatedDuration?: number | null

  @ApiProperty({
    description: 'Story execution status',
    enum: ['queued', 'in_progress', 'completed', 'failed', 'skipped', 'paused'],
    example: 'queued',
  })
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'paused'

  @ApiProperty({
    description: 'Start timestamp',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  startedAt?: string | null

  @ApiProperty({
    description: 'Completion timestamp',
    example: '2024-01-01T00:30:00.000Z',
    nullable: true,
  })
  completedAt?: string | null

  @ApiProperty({
    description: 'Actual duration in seconds',
    example: 1800,
    nullable: true,
  })
  duration?: number | null

  @ApiProperty({
    description: 'Error message if failed',
    example: 'Build failed: missing dependency',
    nullable: true,
  })
  error?: string | null

  @ApiProperty({
    description: 'Story artifacts',
    nullable: true,
  })
  artifacts?: Record<string, unknown> | null

  @ApiProperty({
    description: 'Story sub-steps',
    nullable: true,
  })
  subSteps?: unknown[] | null

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: string
}
