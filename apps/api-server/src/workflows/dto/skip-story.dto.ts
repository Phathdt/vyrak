import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for skipping a story
 */
export const SkipStorySchema = z.object({
  reason: z
    .string()
    .min(10, 'Skip reason must be at least 10 characters')
    .max(500, 'Skip reason must not exceed 500 characters'),
})

/**
 * DTO for skipping a story
 * Used by POST /api/organizations/:orgId/workflows/:runId/stories/:storyId/skip
 */
export class SkipStoryDto extends createZodDto(SkipStorySchema) {
  @ApiProperty({
    description: 'Reason for skipping the story (minimum 10 characters)',
    example: 'This story is no longer relevant based on updated requirements',
    minLength: 10,
    maxLength: 500,
  })
  reason: string
}
