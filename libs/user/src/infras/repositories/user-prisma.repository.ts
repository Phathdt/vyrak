import type { IUserRepository, UserEntity } from '../../domain'
import type { DatabaseService, User as PrismaUser } from '@vyrak/database'

/**
 * User Prisma Repository
 * Handles all database operations for users
 *
 * CRITICAL: NO @Injectable() decorator - Plain TypeScript class
 */
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Map Prisma User model to UserEntity
   * Centralized mapping to avoid duplication
   */
  private mapToEntity(user: PrismaUser): UserEntity {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  async findById(userId: string): Promise<UserEntity | null> {
    try {
      const user = await this.databaseService.client.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return null
      }

      return this.mapToEntity(user)
    } catch (error) {
      console.error('[UserPrismaRepository] findById error:', error)
      throw error
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const user = await this.databaseService.client.user.findUnique({
        where: { email },
      })

      if (!user) {
        return null
      }

      return this.mapToEntity(user)
    } catch (error) {
      console.error('[UserPrismaRepository] findByEmail error:', error)
      throw error
    }
  }

  async create(data: { email: string; name?: string | null; passwordHash?: string | null }): Promise<UserEntity> {
    try {
      const user = await this.databaseService.client.user.create({
        data: {
          email: data.email,
          name: data.name ?? null,
          passwordHash: data.passwordHash ?? null,
        },
      })

      return this.mapToEntity(user)
    } catch (error) {
      console.error('[UserPrismaRepository] create error:', error)
      throw error
    }
  }

  async update(
    userId: string,
    data: {
      name?: string | null
      email?: string
      emailVerified?: boolean
      image?: string | null
    }
  ): Promise<UserEntity> {
    try {
      const user = await this.databaseService.client.user.update({
        where: { id: userId },
        data,
      })

      return this.mapToEntity(user)
    } catch (error) {
      console.error('[UserPrismaRepository] update error:', error)
      throw error
    }
  }
}
