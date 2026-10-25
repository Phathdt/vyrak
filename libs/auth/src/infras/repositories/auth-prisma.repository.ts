import type { PrismaClient } from '@vyrak/database'

import type { IAuthRepository, UserEntity, UserWithOrganizations } from '../../domain'

export class AuthPrismaRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<(UserEntity & { passwordHash: string | null }) | null> {
    try {
      const user = await this.prisma.user.findUnique({
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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          members: {
            include: {
              organization: true,
            },
          },
        },
      })

      return user
    } catch (error) {
      console.error('[AuthPrismaRepository] findUserById error:', error)
      throw error
    }
  }

  async hasAnyOrganization(userId: string): Promise<boolean> {
    try {
      const membership = await this.prisma.member.findFirst({
        where: { userId },
      })

      return !!membership
    } catch (error) {
      console.error('[AuthPrismaRepository] hasAnyOrganization error:', error)
      throw error
    }
  }

  async createPersonalOrganization(userId: string): Promise<{ id: string; name: string; slug: string } | null> {
    try {
      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Create personal organization
      const organization = await this.prisma.organization.create({
        data: {
          name: user.name ? `${user.name}'s Workspace` : 'Personal Workspace',
          slug: `personal-${userId.slice(0, 8)}`,
          members: {
            create: {
              userId: userId,
              role: 'owner',
            },
          },
        },
      })

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      }
    } catch (error) {
      console.error('[AuthPrismaRepository] createPersonalOrganization error:', error)
      return null
    }
  }
}
