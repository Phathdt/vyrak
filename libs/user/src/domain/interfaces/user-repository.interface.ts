import type { UserEntity } from '../entities'

/**
 * User Repository Interface
 * Defines all data access operations for user domain
 */
export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(userId: string): Promise<UserEntity | null>

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<UserEntity | null>

  /**
   * Create new user
   */
  create(data: { email: string; name?: string | null; passwordHash?: string | null }): Promise<UserEntity>

  /**
   * Update user
   */
  update(
    userId: string,
    data: {
      name?: string | null
      email?: string
      emailVerified?: boolean
      image?: string | null
    }
  ): Promise<UserEntity>
}
