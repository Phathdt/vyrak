import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const ChatMessageSchema = z.object({
  workflowId: z.string().uuid(),
  sessionId: z.string().uuid(),
  projectId: z.string().uuid(),
  message: z.string().min(1).max(10000),
  codeSnippets: z
    .array(
      z.object({
        language: z.string(),
        code: z.string(),
      })
    )
    .optional(),
  idempotencyKey: z.string().uuid().optional(),
})

export class ChatMessageDto extends createZodDto(ChatMessageSchema) {}
