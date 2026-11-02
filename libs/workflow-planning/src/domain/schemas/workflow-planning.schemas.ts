import { ApiProperty } from '@nestjs/swagger'
import { MessageRole } from '@vyrak/conversation'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const PlanningCodeSnippetSchema = z.object({
  path: z.string().max(500).optional(),
  label: z.string().max(200).optional(),
  content: z.string().min(1).max(24_000),
})

export const PlanningChatRequestSchema = z.object({
  userMessage: z.string().min(1).max(16_000),
  codeSnippets: z.array(PlanningCodeSnippetSchema).max(5).optional(),
  repoPaths: z.array(z.string().min(1).max(500)).max(8).optional(),
})

export class PlanningCodeSnippetDto extends createZodDto(PlanningCodeSnippetSchema) {
  @ApiProperty({ required: false, example: 'libs/product/src/product.service.ts' })
  path?: string

  @ApiProperty({ required: false, example: 'Product module service' })
  label?: string

  @ApiProperty({ description: 'File or snippet content for the AI to analyze' })
  content: string
}

export class PlanningChatRequestDto extends createZodDto(PlanningChatRequestSchema) {
  @ApiProperty({ example: 'How should we add inventory tables given our existing product module?' })
  userMessage: string

  @ApiProperty({ type: [PlanningCodeSnippetDto], required: false })
  codeSnippets?: PlanningCodeSnippetDto[]

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Repo-relative paths to read from the local main repo checkout (when available)',
    example: ['libs/product/src/application/services/product.service.ts'],
  })
  repoPaths?: string[]
}

export const PlanningMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum([MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM]),
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

export const PlanningChatResponseSchema = z.object({
  sessionId: z.string().uuid(),
  aiMessage: z.string(),
  messageCount: z.number().int().min(0),
  repoFilesLoaded: z.array(
    z.object({
      path: z.string(),
      bytes: z.number().int(),
    })
  ),
  artifactCreated: z.boolean().optional(),
  artifactId: z.string().uuid().optional(),
})

export class PlanningChatResponseDto extends createZodDto(PlanningChatResponseSchema) {
  @ApiProperty()
  sessionId: string

  @ApiProperty()
  aiMessage: string

  @ApiProperty()
  messageCount: number

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  repoFilesLoaded: Array<{ path: string; bytes: number }>

  @ApiProperty({ required: false })
  artifactCreated?: boolean

  @ApiProperty({ required: false })
  artifactId?: string
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
