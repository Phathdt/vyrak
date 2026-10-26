import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

export const ArtifactMetadataSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  stepKey: z.string().nullable(),
  type: z.enum(['plan', 'implementation_report', 'test_result', 'approval_plan', 'other']),
  name: z.string(),
  size: z.number().int().min(0),
  contentType: z.string(),
  createdAt: z.string().datetime(),
})

export class ArtifactMetadataDto extends createZodDto(ArtifactMetadataSchema) {
  @ApiProperty({ description: 'Artifact ID' })
  id!: string

  @ApiProperty({ description: 'Workflow run ID' })
  runId!: string

  @ApiProperty({ type: String, nullable: true, description: 'Step that created this artifact' })
  stepKey!: string | null

  @ApiProperty({
    enum: ['plan', 'implementation_report', 'test_result', 'approval_plan', 'other'],
    description: 'Artifact type',
  })
  type!: 'plan' | 'implementation_report' | 'test_result' | 'approval_plan' | 'other'

  @ApiProperty({ description: 'Artifact name/filename' })
  name!: string

  @ApiProperty({ description: 'Size in bytes' })
  size!: number

  @ApiProperty({ description: 'MIME content type' })
  contentType!: string

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string
}
