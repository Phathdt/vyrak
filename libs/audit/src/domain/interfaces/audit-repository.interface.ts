import { AuditLog, CreateAuditLog } from '../entities/audit-log.entity'

export interface IAuditRepository {
  create(data: CreateAuditLog): Promise<AuditLog>
  findByOrganization(organizationId: string, limit?: number): Promise<AuditLog[]>
  findByUser(userId: string, limit?: number): Promise<AuditLog[]>
  findByEvent(event: string, organizationId: string, limit?: number): Promise<AuditLog[]>
}
