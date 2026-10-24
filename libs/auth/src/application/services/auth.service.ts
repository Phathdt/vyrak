import { Injectable, UnauthorizedException } from '@nestjs/common'

import { PasswordService } from './password.service'

import type { IAuthRepository, UserWithOrganizations } from '../../domain/interfaces/auth-repository.interface'
import type { IAuthService } from '../../domain/interfaces/auth-service.interface'
import { JwtProvider } from '../../infras/jwt/jwt.provider'

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly jwtProvider: JwtProvider,
    private readonly passwordService: PasswordService
  ) {}

  async login(
    email: string,
    password: string
  ): Promise<{
    accessToken: string
    expiresIn: number
    user: { id: string; email: string; name: string | null }
  }> {
    // Find user by email
    const user = await this.authRepository.findByEmail(email)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Verify password
    const isValid = await this.passwordService.verify(user.passwordHash, password)
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Generate JWT
    const token = await this.jwtProvider.sign({
      sub: user.id,
      email: user.email,
    })

    return {
      accessToken: token,
      expiresIn: 86400, // 24h in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  async handleUserOnboarding(userId: string): Promise<void> {
    // Check if user has organization
    const hasOrganization = await this.authRepository.hasAnyOrganization(userId)

    if (hasOrganization) {
      return // User already has organization
    }

    // Create personal organization for user
    await this.authRepository.createPersonalOrganization(userId)
  }

  async getCurrentUser(userId: string): Promise<UserWithOrganizations | null> {
    return this.authRepository.findUserById(userId)
  }
}
