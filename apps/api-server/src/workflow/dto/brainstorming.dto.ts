import { ApiProperty } from '@nestjs/swagger'

export class BrainstormRequestDto {
  @ApiProperty({
    description: 'User message to continue the brainstorming conversation',
    example: 'I need to fix the login page, users are getting 500 errors',
  })
  userMessage!: string
}

export class BrainstormResponseDto {
  @ApiProperty({
    description: 'Conversation session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId!: string

  @ApiProperty({
    description: 'AI assistant response message',
    example: 'I understand you have a login issue. Can you tell me more about when this started happening?',
  })
  aiMessage!: string

  @ApiProperty({
    description: 'Whether the conversation has enough context to classify the workflow',
    example: false,
  })
  canClassify!: boolean

  @ApiProperty({
    description: 'Total number of messages in the conversation',
    example: 4,
  })
  messageCount!: number
}

export class ClassifyRequestDto {
  @ApiProperty({
    description: 'Conversation session ID to classify',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId!: string
}

export class ClassifyResponseDto {
  @ApiProperty({
    description: 'Classified workflow type',
    enum: ['HOTFIX', 'STORY', 'EPIC'],
    example: 'HOTFIX',
  })
  type!: string

  @ApiProperty({
    description: 'Classification confidence score',
    example: 0.95,
    minimum: 0,
    maximum: 1,
  })
  confidence!: number

  @ApiProperty({
    description: 'AI reasoning for the classification',
    example: 'This is a critical production bug affecting login functionality. Single component fix needed urgently.',
  })
  reasoning!: string

  @ApiProperty({
    description: 'Estimated effort in hours',
    example: 2,
  })
  estimatedHours?: number

  @ApiProperty({
    description: 'Suggested priority',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'CRITICAL',
  })
  priority?: string
}
