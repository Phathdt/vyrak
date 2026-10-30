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

  async hasAnyOrganization(userId: string): Promise<boolean> {
    try {
      // Use withSystemAccess since we're checking across all organizations
      return await this.databaseService.withSystemAccess(async () => {
        const membership = await this.databaseService.client.member.findFirst({
          where: { userId },
        })

        return !!membership
      })
    } catch (error) {
      console.error('[AuthPrismaRepository] hasAnyOrganization error:', error)
      throw error
    }
  }

  async createPersonalOrganization(userId: string): Promise<{ id: string; name: string; slug: string } | null> {
    try {
      // Use withSystemAccess to bypass tenant filter, then use transaction
      return await this.databaseService.withSystemAccess(async () => {
        return await this.databaseService.$transaction(async (tx) => {
          // Get user info
          const user = await tx.user.findUnique({
            where: { id: userId },
          })

          if (!user) {
            throw new Error('User not found')
          }

          // Create personal organization
          const organization = await tx.organization.create({
            data: {
              name: user.name ? `${user.name}'s Workspace` : 'Personal Workspace',
              slug: `personal-${userId.slice(0, 8)}`,
            },
          })

          // Create member separately
          await tx.member.create({
            data: {
              organizationId: organization.id,
              userId: userId,
              role: 'owner',
            },
          })

          return {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          }
        })
      })
    } catch (error) {
      console.error('[AuthPrismaRepository] createPersonalOrganization error:', error)
      console.error('[AuthPrismaRepository] error stack:', error instanceof Error ? error.stack : 'no stack')
      console.error('[AuthPrismaRepository] error message:', error instanceof Error ? error.message : String(error))
      return null
    }
  }
}
