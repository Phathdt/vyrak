import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for workflow metrics query parameters
 */
export const WorkflowMetricsQuerySchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week']).default('day'),
})

/**
 * DTO for workflow metrics query parameters
 * Used by GET /api/workflows/metrics
 */
export class WorkflowMetricsQueryDto extends createZodDto(WorkflowMetricsQuerySchema) {
  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  organizationId: string

  @ApiProperty({
    description: 'Project ID (optional, filters to specific project)',
    example: '660e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
    required: false,
  })
  projectId?: string

  @ApiProperty({
    description: 'Start of time range (ISO datetime), defaults to 7 days ago',
    example: '2026-10-19T00:00:00.000Z',
    required: false,
  })
  from?: string

  @ApiProperty({
    description: 'End of time range (ISO datetime), defaults to now',
    example: '2026-10-26T10:51:00.000Z',
    required: false,
  })
  to?: string

  @ApiProperty({
    description: 'Time series granularity',
    enum: ['hour', 'day', 'week'],
    default: 'day',
    example: 'day',
  })
  granularity: 'hour' | 'day' | 'week'
}
