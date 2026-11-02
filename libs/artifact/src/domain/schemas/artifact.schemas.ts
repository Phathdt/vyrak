import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { ArtifactType } from '../entities/artifact.entity'

const ArtifactTypeEnum = z.enum([
  ArtifactType.PRD,
  ArtifactType.ADR,
  ArtifactType.ARD,
  ArtifactType.IMPLEMENTATION_PLAN,
])

export const CreateArtifactSchema = z.object({
  type: ArtifactTypeEnum,
  key: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  phaseId: z.string().uuid().optional(),
  agentExecutionId: z.string().uuid().optional(),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(255).optional(),
})

export class CreateArtifactDto extends createZodDto(CreateArtifactSchema) {
  @ApiProperty({ enum: Object.values(ArtifactType), example: ArtifactType.PRD })
  type: ArtifactType

  @ApiProperty({ example: 'prd', description: 'Stable logical artifact identifier' })
  key: string

  @ApiProperty({ example: 'Checkout Flow PRD' })
  title: string

  @ApiProperty({ description: 'Markdown content of the artifact' })
  content: string

  @ApiProperty({ type: String, nullable: true, required: false })
  phaseId?: string

  @ApiProperty({ type: String, nullable: true, required: false })
  agentExecutionId?: string

  @ApiProperty({ type: String, nullable: true, required: false })
  fileName?: string

  @ApiProperty({ type: String, nullable: true, required: false, example: 'text/markdown' })
  mimeType?: string
}

export const ListArtifactsQuerySchema = z.object({
  type: ArtifactTypeEnum.optional(),
  key: z.string().optional(),
})

export class ListArtifactsQueryDto extends createZodDto(ListArtifactsQuerySchema) {
  @ApiProperty({ enum: Object.values(ArtifactType), required: false })
  type?: ArtifactType

  @ApiProperty({ required: false })
  key?: string
}

export const ArtifactResponseSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid().nullable(),
  agentExecutionId: z.string().uuid().nullable(),
  key: z.string(),
  type: z.string(),
  title: z.string(),
  fileName: z.string().nullable(),
  s3Bucket: z.string(),
  s3Key: z.string(),
  mimeType: z.string().nullable(),
  contentSize: z.number().nullable(),
  checksum: z.string().nullable(),
  version: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Response envelopes are plain decorated classes (matching `WorkflowResponse`)
 * so the generated OpenAPI uses `type: object` instead of Zod's `propertyNames`.
 */
export class ArtifactResponse {
  @ApiProperty()
  id: string

  @ApiProperty()
  organizationId: string

  @ApiProperty()
  workflowId: string

  @ApiProperty({ type: String, nullable: true })
  phaseId: string | null

  @ApiProperty({ type: String, nullable: true })
  agentExecutionId: string | null

  @ApiProperty({ example: 'prd' })
  key: string

  @ApiProperty({ enum: Object.values(ArtifactType), example: ArtifactType.PRD })
  type: string

  @ApiProperty()
  title: string

  @ApiProperty({ type: String, nullable: true })
  fileName: string | null

  @ApiProperty()
  s3Bucket: string

  @ApiProperty()
  s3Key: string

  @ApiProperty({ type: String, nullable: true, example: 'text/markdown' })
  mimeType: string | null

  @ApiProperty({ type: Number, nullable: true })
  contentSize: number | null

  @ApiProperty({ type: String, nullable: true })
  checksum: string | null

  @ApiProperty({ example: 1 })
  version: number

  @ApiProperty({ type: Object, example: null, nullable: true })
  metadata: Record<string, unknown> | null

  @ApiProperty()
  createdAt: string

  @ApiProperty()
  updatedAt: string
}

export class ArtifactListResponse {
  @ApiProperty({ type: [ArtifactResponse] })
  items: ArtifactResponse[]
}

export const ArtifactWithContentResponseSchema = ArtifactResponseSchema.extend({
  content: z.string(),
})

export class ArtifactWithContentResponse extends ArtifactResponse {
  @ApiProperty({ description: 'Markdown content fetched from object storage' })
  content: string
}
