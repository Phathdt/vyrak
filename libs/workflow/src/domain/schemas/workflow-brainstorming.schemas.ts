import { ApiProperty } from '@nestjs/swagger'
import { MessageRole } from '@vyrak/conversation'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { WorkflowType } from '../entities'
import { ClassificationPriority } from '../interfaces/workflow-brainstorming-service.interface'

export const BrainstormRequestSchema = z.object({
  userMessage: z.string().min(1),
})

export class BrainstormRequestDto extends createZodDto(BrainstormRequestSchema) {
  @ApiProperty({
    description: 'User message to continue the brainstorming conversation',
    example: 'I need to fix the login page, users are getting 500 errors',
  })
  userMessage: string
}

export const BrainstormMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum([MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM]),
  content: z.string(),
  createdAt: z.string(),
})

export class BrainstormMessageDto extends createZodDto(BrainstormMessageSchema) {
  @ApiProperty({ description: 'Message ID' })
  id: string

  @ApiProperty({ enum: Object.values(MessageRole), description: 'Message role' })
  role: (typeof MessageRole)[keyof typeof MessageRole]

  @ApiProperty({ description: 'Message content' })
  content: string

  @ApiProperty({ description: 'Creation timestamp (ISO 8601)' })
  createdAt: string
}

export const BrainstormSessionResponseSchema = z.object({
  sessionId: z.string().uuid().nullable(),
  messages: z.array(BrainstormMessageSchema),
  canClassify: z.boolean(),
  messageCount: z.number().int().min(0),
})

export class BrainstormSessionResponseDto extends createZodDto(BrainstormSessionResponseSchema) {
  @ApiProperty({
    description: 'Active brainstorming session ID, or null if no session yet',
    nullable: true,
    type: String,
  })
  sessionId: string | null

  @ApiProperty({ type: [BrainstormMessageDto], description: 'Messages in chronological order' })
  messages: BrainstormMessageDto[]

  @ApiProperty({ description: 'Whether the conversation has enough context to classify' })
  canClassify: boolean

  @ApiProperty({ description: 'Total message count in the session' })
  messageCount: number
}

export const BrainstormResponseSchema = z.object({
  sessionId: z.string().uuid(),
  aiMessage: z.string(),
  canClassify: z.boolean(),
  messageCount: z.number().int().min(0),
})

export class BrainstormResponseDto extends createZodDto(BrainstormResponseSchema) {
  @ApiProperty({
    description: 'Conversation session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string

  @ApiProperty({
    description: 'AI assistant response message',
    example: 'I understand you have a login issue. Can you tell me more about when this started happening?',
  })
  aiMessage: string

  @ApiProperty({
    description: 'Whether the conversation has enough context to classify the workflow',
    example: false,
  })
  canClassify: boolean

  @ApiProperty({
    description: 'Total number of messages in the conversation',
    example: 4,
  })
  messageCount: number
}

export const ClassifyRequestSchema = z.object({
  sessionId: z.string().uuid(),
})

export class ClassifyRequestDto extends createZodDto(ClassifyRequestSchema) {
  @ApiProperty({
    description: 'Conversation session ID to classify',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string
}

export const ClassifyResponseSchema = z.object({
  type: z.enum([WorkflowType.HOTFIX, WorkflowType.STORY, WorkflowType.EPIC]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  estimatedHours: z.number().optional(),
  priority: z
    .enum([
      ClassificationPriority.LOW,
      ClassificationPriority.MEDIUM,
      ClassificationPriority.HIGH,
      ClassificationPriority.CRITICAL,
    ])
    .optional(),
})

export class ClassifyResponseDto extends createZodDto(ClassifyResponseSchema) {
  @ApiProperty({
    description: 'Classified workflow type',
    enum: Object.values(WorkflowType),
    example: WorkflowType.HOTFIX,
  })
  type: (typeof WorkflowType)[keyof typeof WorkflowType]

  @ApiProperty({
    description: 'Classification confidence score',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  confidence: number

  @ApiProperty({
    description: 'AI reasoning for the classification',
    example: 'This is a critical production bug affecting login functionality. Single component fix needed urgently.',
  })
  reasoning: string

  @ApiProperty({
    description: 'Estimated effort in hours',
    example: 2,
    required: false,
  })
  estimatedHours?: number

  @ApiProperty({
    description: 'Suggested priority',
    enum: Object.values(ClassificationPriority),
    example: ClassificationPriority.CRITICAL,
    required: false,
  })
  priority?: ClassificationPriority
}
