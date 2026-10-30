import * as argon2 from 'argon2'

/**
 * Password Service
 * Handles password hashing and verification using Argon2
 * Plain TypeScript class - NO NestJS decorators
 */
export class PasswordService {
  /**
   * Hash a plain text password using Argon2id
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    })
  }

  /**
   * Verify a password against an Argon2 hash
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }
}
