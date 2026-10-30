import type { UserWithOrganizations } from './auth-repository.interface'

/**
 * Auth service interface
 * Defines all business logic operations for authentication
 */
export interface IAuthService {
  /**
   * Login with email and password
   * @throws UnauthorizedError if credentials are invalid
   */
  login(
    email: string,
    password: string
  ): Promise<{
    accessToken: string
    expiresIn: number
    user: { id: string; email: string; name: string | null }
  }>

  /**
   * Handle onboarding for new user - create organization if not exists
   */
  handleUserOnboarding(userId: string): Promise<void>

  /**
   * Get current user with organizations
   */
  getCurrentUser(userId: string): Promise<UserWithOrganizations | null>
}
