import type { IAuthRepository, UserWithOrganizations } from '../../domain'
import type { DatabaseService } from '@vyrak/database'

export class AuthPrismaRepository implements IAuthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findUserById(userId: string): Promise<UserWithOrganizations | null> {
    try {
      // Use withSystemAccess to bypass tenant filter for cross-organization user lookup
      // This is needed because we're fetching user info across all their organizations
      return await this.databaseService.withSystemAccess(async () => {
        const user = await this.databaseService.client.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          return null
        }

        // Manually fetch members and organizations
        const members = await this.databaseService.client.member.findMany({
          where: { userId },
        })

        const organizationIds = members.map((m) => m.organizationId)
        const organizations = await this.databaseService.client.organization.findMany({
          where: { id: { in: organizationIds } },
        })

        // Build the result with nested structure
        const membersWithOrgs = members.map((member) => ({
          ...member,
          organization: organizations.find((org) => org.id === member.organizationId)!,
        }))

        return {
          ...user,
          members: membersWithOrgs,
        }
      })
    } catch (error) {
      console.error('[AuthPrismaRepository] findUserById error:', error)
      throw error
    }
  }
}
