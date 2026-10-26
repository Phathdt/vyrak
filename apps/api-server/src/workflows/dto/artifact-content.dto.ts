import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

export const ArtifactContentSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  name: z.string(),
  contentType: z.string(),
  content: z.union([z.string(), z.record(z.unknown())]),
  size: z.number().int().min(0),
})

export class ArtifactContentDto extends createZodDto(ArtifactContentSchema) {
  @ApiProperty({ description: 'Artifact ID' })
  id!: string

  @ApiProperty({ description: 'Workflow run ID' })
  runId!: string

  @ApiProperty({ description: 'Artifact name' })
  name!: string

  @ApiProperty({ description: 'Content type' })
  contentType!: string

  @ApiProperty({
    description: 'Artifact content (string or JSON)',
    oneOf: [{ type: 'string' }, { type: 'object' }],
  })
  content!: string | Record<string, unknown>

  @ApiProperty({ description: 'Content size in bytes' })
  size!: number
}
