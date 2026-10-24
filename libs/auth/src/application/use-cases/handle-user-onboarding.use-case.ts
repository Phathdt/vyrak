import type { AuthRepository } from '../ports/auth.repository'

/**
 * Use Case: Handle user onboarding
 *
 * Creates a personal organization for new users who don't have any organization yet.
 * This ensures every user has at least one workspace to operate in.
 *
 * @pure - No framework dependencies, testable without DI container
 */
export class HandleUserOnboardingUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  /**
   * Execute the use case
   *
   * @param userId - The user ID to onboard
   * @returns Promise<void>
   */
  async execute(userId: string): Promise<void> {
    // Check if user already has an organization
    const hasOrganization = await this.authRepository.hasAnyOrganization(userId)

    if (hasOrganization) {
      return // User already onboarded
    }

    // Create personal organization
    await this.authRepository.createPersonalOrganization(userId)
  }
}
