import { z } from 'zod'

export const GitRepositoryEntitySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  url: z.string().url(),
  branch: z.string().min(1),
  provider: z.string().min(1),
  status: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type GitRepositoryEntity = z.infer<typeof GitRepositoryEntitySchema>
