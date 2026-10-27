import { z } from 'zod'

export const ProjectEntitySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type ProjectEntity = z.infer<typeof ProjectEntitySchema>
