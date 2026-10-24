import { UserWithOrganizations } from './auth-repository.interface'

export interface IAuthService {
  /**
   * Xử lý onboarding cho user mới - tạo organization nếu chưa có
   */
  handleUserOnboarding(userId: string): Promise<void>

  /**
   * Lấy thông tin user hiện tại kèm organizations
   */
  getCurrentUser(userId: string): Promise<UserWithOrganizations | null>
}
