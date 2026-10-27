import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for creating a workflow with template
 */
export const CreateWorkflowFromTemplateSchema = z.object({
  templateId: z.string().uuid('Template ID must be a valid UUID'),
  requirement: z
    .string()
    .min(10, 'Requirement must be at least 10 characters')
    .max(5000, 'Requirement must not exceed 5000 characters'),
  repositoryId: z.string().uuid('Repository ID must be a valid UUID'),
  branch: z
    .string()
    .min(1, 'Branch name must not be empty')
    .max(255, 'Branch name must not exceed 255 characters')
    .default('main'),
  storyCount: z.number().int().min(1).max(20).optional(),
  idempotencyKey: z.string().min(1).max(255).optional(),
})

/**
 * DTO for creating a workflow from a template
 * Extends CreateWorkflowRunDto with template-specific fields
 */
export class CreateWorkflowFromTemplateDto extends createZodDto(CreateWorkflowFromTemplateSchema) {
  @ApiProperty({
    description: 'UUID of the workflow template to use',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  templateId: string

  @ApiProperty({
    description: 'Detailed requirement or task description for the workflow',
    example: 'Implement user authentication with JWT tokens',
    minLength: 10,
    maxLength: 5000,
  })
  requirement: string

  @ApiProperty({
    description: 'UUID of the repository to execute the workflow on',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  repositoryId: string

  @ApiProperty({
    description: 'Git branch to work on',
    example: 'main',
    default: 'main',
    minLength: 1,
    maxLength: 255,
  })
  branch: string

  @ApiProperty({
    description: 'Number of stories to generate (1-20 for feature, 1 for hotfix)',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  storyCount?: number

  @ApiProperty({
    description: 'Optional idempotency key to prevent duplicate workflow runs',
    example: 'unique-key-12345',
    maxLength: 255,
  })
  idempotencyKey?: string
}
