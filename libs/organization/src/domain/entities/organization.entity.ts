import { z } from 'zod'

export const OrganizationEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type OrganizationEntity = z.infer<typeof OrganizationEntitySchema>

export const MemberEntitySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  createdAt: z.date(),
})

export type MemberEntity = z.infer<typeof MemberEntitySchema>

export const InvitationEntitySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
  inviterId: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
})

export type InvitationEntity = z.infer<typeof InvitationEntitySchema>
