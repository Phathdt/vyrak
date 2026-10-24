import { z } from 'zod'

export const MemberRoleSchema = z.enum(['owner', 'admin', 'member'])

export type MemberRole = z.infer<typeof MemberRoleSchema>

export const MemberEntitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  role: MemberRoleSchema,
  createdAt: z.date(),
})

export type MemberEntity = z.infer<typeof MemberEntitySchema>
