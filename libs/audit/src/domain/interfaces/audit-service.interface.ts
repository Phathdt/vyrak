import { AuditLog, CreateAuditLog } from '../entities/audit-log.entity'

export interface IAuditService {
  logEvent(data: CreateAuditLog): Promise<AuditLog>
  getOrganizationLogs(organizationId: string, limit?: number): Promise<AuditLog[]>
  getUserLogs(userId: string, limit?: number): Promise<AuditLog[]>
  getEventLogs(event: string, organizationId: string, limit?: number): Promise<AuditLog[]>
}
