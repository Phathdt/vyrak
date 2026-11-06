import { ApiProperty } from '@nestjs/swagger'
import { MessageRole } from '@vyrak/conversation'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const PlanningMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum([MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM, MessageRole.EVENT]),
  content: z.string(),
  createdAt: z.string(),
})

export class PlanningMessageDto extends createZodDto(PlanningMessageSchema) {}

export const PlanningSessionResponseSchema = z.object({
  sessionId: z.string().uuid().nullable(),
  messages: z.array(PlanningMessageSchema),
  messageCount: z.number().int().min(0),
  repositories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
      branch: z.string(),
    })
  ),
})

export class PlanningSessionResponseDto extends createZodDto(PlanningSessionResponseSchema) {
  @ApiProperty({ type: String, nullable: true })
  sessionId: string | null

  @ApiProperty({ type: [PlanningMessageDto] })
  messages: PlanningMessageDto[]

  @ApiProperty()
  messageCount: number

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  repositories: Array<{ id: string; name: string; url: string; branch: string }>
}

export const GeneratePRDResponseSchema = z.object({
  artifactId: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  downloadUrl: z.string().url(),
  approvalStatus: z.string(),
})

export class GeneratePRDResponseDto extends createZodDto(GeneratePRDResponseSchema) {
  @ApiProperty({ description: 'Artifact ID' })
  artifactId: string

  @ApiProperty({ description: 'Artifact key (e.g., "prd")' })
  key: string

  @ApiProperty({ description: 'Artifact title' })
  title: string

  @ApiProperty({ description: 'S3 download URL' })
  downloadUrl: string

  @ApiProperty({ description: 'Approval status (DRAFT, PENDING_APPROVAL, APPROVED, REJECTED)' })
  approvalStatus: string
}

export const GeneratePRDFromMessageRequestSchema = z.object({
  messageId: z.string().uuid(),
})

export class GeneratePRDFromMessageRequestDto extends createZodDto(GeneratePRDFromMessageRequestSchema) {
  @ApiProperty({ description: 'Message ID containing the PRD artifact' })
  messageId: string
}
