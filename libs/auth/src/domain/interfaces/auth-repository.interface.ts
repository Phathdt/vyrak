/**
 * User entity with organization memberships
 */
export interface UserWithOrganizations {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
  image: string | null
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
   * Find user by ID with organization memberships
   */
  findUserById(userId: string): Promise<UserWithOrganizations | null>
}
