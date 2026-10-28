import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for workflow template phase
 */
const WorkflowTemplatePhaseSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  estimatedDuration: z.number().optional(),
})

/**
 * Zod schema for workflow template response
 */
export const WorkflowTemplateSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  storyBased: z.boolean(),
  phases: z.array(WorkflowTemplatePhaseSchema),
  estimatedDuration: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    })
    .optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * DTO for workflow template response
 * Used by GET /api/organizations/:orgId/workflows/templates
 */
export class WorkflowTemplateDto extends createZodDto(WorkflowTemplateSchema) {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string

  @ApiProperty({
    description: 'Unique template key',
    example: 'feature-workflow',
  })
  key: string

  @ApiProperty({
    description: 'Template name',
    example: 'Feature Development',
  })
  name: string

  @ApiProperty({
    description: 'Template description',
    example: 'Full-cycle feature development workflow',
  })
  description: string

  @ApiProperty({
    description: 'Icon emoji or identifier',
    example: '🚀',
  })
  icon: string

  @ApiProperty({
    description: 'Whether this template uses story-based execution',
    example: true,
  })
  storyBased: boolean

  @ApiProperty({
    description: 'Workflow phases',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        estimatedDuration: { type: 'number', nullable: true },
      },
    },
  })
  phases: Array<{
    key: string
    name: string
    description?: string
    estimatedDuration?: number
  }>

  @ApiProperty({
    description: 'Estimated duration range in minutes',
    example: { min: 15, max: 45 },
  })
  estimatedDuration?: {
    min: number | null
    max: number | null
  }

  @ApiProperty({
    description: 'Whether template is active',
    example: true,
  })
  isActive: boolean

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
