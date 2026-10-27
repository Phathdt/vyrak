import { describe, expect, it } from 'vitest'

import { maskToken, sanitizeErrorMessage } from './security'

describe('security utilities', () => {
  describe('maskToken', () => {
    it('should mask any token with bullets', () => {
      const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz'
      const masked = maskToken(token)
      expect(masked).toBe('••••••••••••••••')
      expect(masked).not.toContain(token)
    })

    it('should return empty string for undefined', () => {
      expect(maskToken(undefined)).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(maskToken('')).toBe('')
    })

    it('should never expose the actual token', () => {
      const tokens = ['ghp_1234567890abcdefghijklmnopqrstuvwxyz', 'glpat-abcdefghijklmnopqrst', 'a'.repeat(40)]

      tokens.forEach((token) => {
        const masked = maskToken(token)
        expect(masked).not.toContain(token)
        expect(masked).toBe('••••••••••••••••')
      })
    })
  })

  describe('sanitizeErrorMessage', () => {
    it('should redact GitHub tokens', () => {
      const error = new Error('Authentication failed with token ghp_1234567890abcdefghijklmnopqrstuvwxyz')
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).not.toContain('ghp_')
      expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]')
    })

    it('should redact GitLab tokens', () => {
      const error = new Error('Failed to clone with glpat-abcdefghijklmnopqrst')
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).not.toContain('glpat-')
      expect(sanitized).toContain('[REDACTED_GITLAB_TOKEN]')
    })

    it('should redact generic long tokens', () => {
      const token = 'a'.repeat(40)
      const error = new Error(`Token ${token} is invalid`)
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).not.toContain(token)
      expect(sanitized).toContain('[REDACTED_TOKEN]')
    })

    it('should handle Error objects', () => {
      const error = new Error('Some error with ghp_1234567890abcdefghijklmnopqrstuvwxyz')
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]')
    })

    it('should handle string errors', () => {
      const error = 'String error with ghp_1234567890abcdefghijklmnopqrstuvwxyz'
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]')
    })

    it('should handle non-Error objects', () => {
      const error = { message: 'Object with ghp_1234567890abcdefghijklmnopqrstuvwxyz' }
      const sanitized = sanitizeErrorMessage(error)
      // String() on object produces [object Object], so token isn't exposed
      expect(sanitized).toBe('[object Object]')
    })

    it('should preserve safe error messages', () => {
      const error = new Error('Network connection failed')
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).toBe('Network connection failed')
    })

    it('should handle multiple tokens in one message', () => {
      const error = new Error('Tried ghp_1234567890abcdefghijklmnopqrstuvwxyz and glpat-abcdefghijklmnopqrst')
      const sanitized = sanitizeErrorMessage(error)
      expect(sanitized).not.toContain('ghp_')
      expect(sanitized).not.toContain('glpat-')
      expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]')
      expect(sanitized).toContain('[REDACTED_GITLAB_TOKEN]')
    })
  })
})
