import type { UserEntity } from '../entities'

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

export interface IAuthRepository {
  /**
   * Tìm user theo ID kèm theo organization memberships
   */
  findUserById(userId: string): Promise<UserWithOrganizations | null>

  /**
   * Kiểm tra xem user đã có organization nào chưa
   */
  hasAnyOrganization(userId: string): Promise<boolean>

  /**
   * Tạo personal organization cho user
   */
  createPersonalOrganization(userId: string): Promise<{
    id: string
    name: string
    slug: string
  } | null>
}
