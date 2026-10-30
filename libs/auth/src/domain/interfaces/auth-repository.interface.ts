import type { MemberEntity, OrganizationEntity } from '@vyrak/organization'
import type { UserEntity } from '@vyrak/user'

/**
 * Member with nested organization
 * Extends MemberEntity with organization details
 */
export interface MemberWithOrganization extends MemberEntity {
  organization: OrganizationEntity
}

/**
 * User entity with organization memberships
 * Composed from UserEntity + MemberWithOrganization array
 */
export interface UserWithOrganizations extends Omit<UserEntity, 'passwordHash' | 'createdAt' | 'updatedAt'> {
  members: MemberWithOrganization[]
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
