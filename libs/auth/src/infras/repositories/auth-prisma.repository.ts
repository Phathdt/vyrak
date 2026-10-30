import type { IAuthRepository, MemberWithOrganization, UserWithOrganizations } from '../../domain'
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

        // Build the result with nested structure, casting to proper types
        const membersWithOrgs: MemberWithOrganization[] = members.map((member) => ({
          id: member.id,
          organizationId: member.organizationId,
          userId: member.userId,
          role: member.role as 'owner' | 'admin' | 'member',
          createdAt: member.createdAt,
          organization: {
            id: member.organizationId,
            name: organizations.find((org) => org.id === member.organizationId)!.name,
            slug: organizations.find((org) => org.id === member.organizationId)!.slug,
            logo: organizations.find((org) => org.id === member.organizationId)!.logo,
            createdAt: organizations.find((org) => org.id === member.organizationId)!.createdAt,
            updatedAt: organizations.find((org) => org.id === member.organizationId)!.updatedAt,
          },
        }))

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          image: user.image,
          members: membersWithOrgs,
        }
      })
    } catch (error) {
      console.error('[AuthPrismaRepository] findUserById error:', error)
      throw error
    }
  }
}
