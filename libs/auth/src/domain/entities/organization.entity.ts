import { z } from 'zod'

export const OrganizationEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type OrganizationEntity = z.infer<typeof OrganizationEntitySchema>
