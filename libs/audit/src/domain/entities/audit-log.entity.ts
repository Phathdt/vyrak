import { z } from 'zod'

const auditActions = ['create', 'update', 'delete', 'read'] as const

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  event: z.string(),
  action: z.enum(auditActions),
  resource: z.string(),
  resourceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
})

export type AuditLog = z.infer<typeof AuditLogSchema>

export const CreateAuditLogSchema = AuditLogSchema.omit({
  id: true,
  createdAt: true,
})

export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>
