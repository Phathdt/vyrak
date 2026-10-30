import type { IAuthRepository, IAuthService, UserWithOrganizations } from '../../domain'

/**
 * Custom error for authentication failures
 */
class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError)
    }
  }
}

/**
 * JWT Provider interface
 */
interface IJwtProvider {
  sign(payload: { sub: string; email: string }): Promise<string>
}

/**
 * Password Service interface
 */
interface IPasswordService {
  verify(hash: string, password: string): Promise<boolean>
}

/**
 * Auth Service implementation
 * Plain TypeScript class - NO NestJS decorators
 */
export class AuthService implements IAuthService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly jwtProvider: IJwtProvider,
    private readonly passwordService: IPasswordService
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
      throw new UnauthorizedError('Invalid credentials')
    }

    // Verify password
    const isValid = await this.passwordService.verify(user.passwordHash, password)
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials')
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

  async getCurrentUser(userId: string): Promise<UserWithOrganizations | null> {
    return this.authRepository.findUserById(userId)
  }
}
