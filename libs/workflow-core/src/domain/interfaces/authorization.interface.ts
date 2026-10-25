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

  /**
   * Validate user has approval permission for project
   * Typically checks for 'reviewer' role in organization
   * @throws UnauthorizedAccessError if user lacks permission
   */
  requireApprovalPermission(userId: string, organizationId: string, projectId: string): Promise<void>
}
