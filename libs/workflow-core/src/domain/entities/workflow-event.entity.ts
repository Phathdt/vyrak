import { z } from 'zod'

/**
 * Schema for WorkflowEvent entity validation
 */
export const WorkflowEventEntitySchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  organizationId: z.string().uuid(),
  stepRunId: z.string().uuid().nullable(),
  sequence: z.number().int().positive(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  createdAt: z.date(),
})

export type WorkflowEventEntity = z.infer<typeof WorkflowEventEntitySchema>
