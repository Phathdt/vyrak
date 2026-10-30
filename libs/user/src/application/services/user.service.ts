import type { IUserRepository, IUserService, UserEntity } from '../../domain'

/**
 * User Service
 * Pure CRUD operations for user domain
 *
 * CRITICAL: NO @Injectable() decorator - Plain TypeScript class
 */
export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async findById(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findById(userId)
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email)
  }

  async create(data: { email: string; name?: string | null; passwordHash?: string | null }): Promise<UserEntity> {
    return this.userRepository.create(data)
  }

  async update(
    userId: string,
    data: {
      name?: string | null
      email?: string
      emailVerified?: boolean
      image?: string | null
    }
  ): Promise<UserEntity> {
    return this.userRepository.update(userId, data)
  }
}
