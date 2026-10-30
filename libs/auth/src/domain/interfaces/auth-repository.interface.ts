import type { UserEntity } from '../entities'

/**
 * User entity with organization memberships
 */
export interface UserWithOrganizations extends UserEntity {
  members: Array<{
    id: string
    userId: string
    organizationId: string
    role: string
    createdAt: Date
    organization: {
      id: string
      name: string
      slug: string
      createdAt: Date
      updatedAt: Date
    }
  }>
}

/**
 * Auth repository interface
 * Defines all data access operations for authentication
 */
export interface IAuthRepository {
  /**
   * Find user by email with password hash
   */
  findByEmail(email: string): Promise<(UserEntity & { passwordHash: string | null }) | null>

  /**
   * Find user by ID with organization memberships
   */
  findUserById(userId: string): Promise<UserWithOrganizations | null>
}
