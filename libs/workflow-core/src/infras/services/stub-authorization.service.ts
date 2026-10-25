import type { IAuthorizationService } from '../../domain/interfaces/authorization.interface'

/**
 * Stub authorization service for development
 * Always grants access - will be replaced with real implementation later
 */
export class StubAuthorizationService implements IAuthorizationService {
  async verifyOrganizationAccess(_userId: string, _organizationId: string): Promise<void> {
    // Stub: always allow access
    return
  }

  async verifyProjectAccess(_userId: string, _projectId: string, _organizationId: string): Promise<void> {
    // Stub: always allow access
    return
  }

  async requireApprovalPermission(_userId: string, _organizationId: string, _projectId: string): Promise<void> {
    // Stub: always allow approval permission
    return
  }
}
