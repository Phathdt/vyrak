/**
 * Authorization service interface
 * Stub for future implementation - will integrate with auth module later
 */
export interface IAuthorizationService {
  /**
   * Check if user has access to organization
   * @throws UnauthorizedException if access denied
   */
  verifyOrganizationAccess(userId: string, organizationId: string): Promise<void>

  /**
   * Check if user has access to project
   * @throws UnauthorizedException if access denied
   */
  verifyProjectAccess(userId: string, projectId: string, organizationId: string): Promise<void>
}
