import { Inject, Injectable } from '@nestjs/common'

import type { IAuthRepository, UserWithOrganizations } from '../../domain/interfaces/auth-repository.interface'
import type { IAuthService } from '../../domain/interfaces/auth-service.interface'
import { AUTH_REPOSITORY } from '../../infras/di'

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(AUTH_REPOSITORY)
    private readonly authRepository: IAuthRepository
  ) {}

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
