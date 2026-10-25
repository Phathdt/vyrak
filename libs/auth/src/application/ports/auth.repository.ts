import type { UserWithOrganizations } from '../../domain'

export type { UserWithOrganizations }

export interface AuthRepository {
  /**
   * Find user by ID with organization memberships
   */
  findUserById(userId: string): Promise<UserWithOrganizations | null>

  /**
   * Check if user has any organization
   */
  hasAnyOrganization(userId: string): Promise<boolean>

  /**
   * Create personal organization for user
   */
  createPersonalOrganization(userId: string): Promise<{
    id: string
    name: string
    slug: string
  } | null>
}
