import { z } from 'zod'

export const UserEntitySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type UserEntity = z.infer<typeof UserEntitySchema>
