/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { PasswordService } from './password.service'

describe('PasswordService', () => {
  const service = new PasswordService()

  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123'
      const hash = await service.hash(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash).toMatch(/^\$argon2id\$/)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'same-password'
      const hash1 = await service.hash(password)
      const hash2 = await service.hash(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'correct-password'
      const hash = await service.hash(password)

      const result = await service.verify(hash, password)

      expect(result).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'correct-password'
      const hash = await service.hash(password)

      const result = await service.verify(hash, 'wrong-password')

      expect(result).toBe(false)
    })

    it('should return false for invalid hash format', async () => {
      const result = await service.verify('invalid-hash', 'any-password')

      expect(result).toBe(false)
    })

    it('should return false for empty hash', async () => {
      const result = await service.verify('', 'any-password')

      expect(result).toBe(false)
    })
  })
})
