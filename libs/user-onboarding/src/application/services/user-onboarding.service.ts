import type { IUserOnboardingService } from '../../domain'
import type { IOrganizationService } from '@vyrak/organization'

/**
 * User Onboarding Service
 * Orchestrates user onboarding by coordinating organization creation
 *
 * CRITICAL: NO @Injectable() decorator - Plain TypeScript class
 */
export class UserOnboardingService implements IUserOnboardingService {
  constructor(private readonly organizationService: IOrganizationService) {}

  async handleUserOnboarding(userId: string): Promise<void> {
    // Check if user already has any organization
    const organizations = await this.organizationService.findAllForUser(userId)

    if (organizations.length > 0) {
      return // User already has organization
    }

    // Get user info to create personal workspace
    // For now, we'll create a generic personal workspace
    // In the future, this could be enhanced to fetch user name
    await this.organizationService.create(userId, {
      name: 'Personal Workspace',
      slug: `personal-${userId.slice(0, 8)}`,
    })
  }
}
