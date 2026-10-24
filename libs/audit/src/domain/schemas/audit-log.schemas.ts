import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const auditActions = ['create', 'update', 'delete', 'read'] as const

export const CreateAuditLogDtoSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  event: z.string(),
  action: z.enum(auditActions),
  resource: z.string(),
  resourceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export class CreateAuditLogDto extends createZodDto(CreateAuditLogDtoSchema) {}

export const AuditLogResponseDtoSchema = CreateAuditLogDtoSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string(),
})

export class AuditLogResponseDto extends createZodDto(AuditLogResponseDtoSchema) {}
