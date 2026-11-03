import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const JoinWorkflowSchema = z.object({
  workflowId: z.string().uuid(),
})

export class JoinWorkflowDto extends createZodDto(JoinWorkflowSchema) {}
