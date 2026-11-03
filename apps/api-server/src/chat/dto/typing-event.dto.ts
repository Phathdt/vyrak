import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const TypingEventSchema = z.object({
  workflowId: z.string().uuid(),
})

export class TypingEventDto extends createZodDto(TypingEventSchema) {}
