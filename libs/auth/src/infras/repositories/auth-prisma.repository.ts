import type { IAuthRepository, UserEntity, UserWithOrganizations } from '../../domain'
import type { DatabaseService } from '@vyrak/database'

export class AuthPrismaRepository implements IAuthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByEmail(email: string): Promise<(UserEntity & { passwordHash: string | null }) | null> {
    try {
      const user = await this.databaseService.client.user.findUnique({
        where: { email },
      })

      if (!user) {
        return null
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    } catch (error) {
      console.error('[AuthPrismaRepository] findByEmail error:', error)
      throw error
    }
  }

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
