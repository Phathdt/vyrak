import type { UserEntity } from '../entities'

/**
 * User Service Interface
 * Defines all business logic operations for user domain
 */
export interface IUserService {
  /**
   * Find user by ID
   */
  findById(userId: string): Promise<UserEntity | null>

  /**
   * Find user by email (includes passwordHash for authentication)
   */
  findByEmail(email: string): Promise<UserEntity | null>

  /**
   * Create new user
   */
  create(data: { email: string; name?: string | null; passwordHash?: string | null }): Promise<UserEntity>

  /**
   * Update user profile
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
