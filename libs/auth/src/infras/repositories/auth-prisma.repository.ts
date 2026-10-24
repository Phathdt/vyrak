import { Injectable } from '@nestjs/common'
import { prisma } from '@vyrak/database'

import type { IAuthRepository, UserWithOrganizations } from '../../domain/interfaces/auth-repository.interface'

@Injectable()
export class AuthPrismaRepository implements IAuthRepository {
  async findUserById(userId: string): Promise<UserWithOrganizations | null> {
    try {
      const user = await prisma.user.findUnique({
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
      const membership = await prisma.member.findFirst({
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
      // Lấy thông tin user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Tạo personal organization
      const organization = await prisma.organization.create({
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
