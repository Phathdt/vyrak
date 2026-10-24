import type { IAuthRepository, UserWithOrganizations } from '../../domain/interfaces/auth-repository.interface'
import type { IAuthService } from '../../domain/interfaces/auth-service.interface'

export class AuthService implements IAuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  async handleUserOnboarding(userId: string): Promise<void> {
    // Kiểm tra xem user đã có organization chưa
    const hasOrganization = await this.authRepository.hasAnyOrganization(userId)

    if (hasOrganization) {
      return // User đã có organization
    }

    // Tạo personal organization cho user
    await this.authRepository.createPersonalOrganization(userId)
  }

  async getCurrentUser(userId: string): Promise<UserWithOrganizations | null> {
    return this.authRepository.findUserById(userId)
  }
}
