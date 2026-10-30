/**
 * User Onboarding Service Interface
 * Orchestrates user onboarding flow - creates personal organization for new users
 */
export interface IUserOnboardingService {
  /**
   * Handle onboarding for new user
   * - Checks if user already has an organization
   * - Creates personal organization if needed
   *
   * @param userId - User ID to onboard
   * @returns Promise that resolves when onboarding is complete
   */
  handleUserOnboarding(userId: string): Promise<void>
}
