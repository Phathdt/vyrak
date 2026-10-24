import type { AuthRepository, UserWithOrganizations } from '../ports/auth.repository'

/**
 * Use Case: Get current user
 *
 * Retrieves user information including all organization memberships.
 * Used for populating user context in requests.
 *
 * @pure - No framework dependencies, testable without DI container
 */
export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  /**
   * Execute the use case
   *
   * @param userId - The user ID to retrieve
   * @returns User with organizations, or null if not found
   */
  async execute(userId: string): Promise<UserWithOrganizations | null> {
    return this.authRepository.findUserById(userId)
  }
}
