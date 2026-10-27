import { describe, expect, it } from 'vitest'

import { detectProvider, formatRepoUrl, getProviderIcon, getProviderInfo, validateTokenFormat } from './git-provider'

describe('git-provider utilities', () => {
  describe('detectProvider', () => {
    it('should detect GitHub', () => {
      expect(detectProvider('https://github.com/user/repo.git')).toBe('github')
      expect(detectProvider('https://www.github.com/user/repo.git')).toBe('github')
    })

    it('should detect GitLab', () => {
      expect(detectProvider('https://gitlab.com/user/repo.git')).toBe('gitlab')
      expect(detectProvider('https://gitlab.example.com/user/repo.git')).toBe('gitlab')
    })

    it('should detect Bitbucket', () => {
      expect(detectProvider('https://bitbucket.org/user/repo.git')).toBe('bitbucket')
      expect(detectProvider('https://bitbucket.example.com/user/repo.git')).toBe('bitbucket')
    })

    it('should return null for unknown providers', () => {
      expect(detectProvider('https://example.com/user/repo.git')).toBeNull()
    })

    it('should return null for invalid URLs', () => {
      expect(detectProvider('not-a-url')).toBeNull()
    })
  })

  describe('getProviderInfo', () => {
    it('should return GitHub info', () => {
      const info = getProviderInfo('github')
      expect(info.name).toBe('GitHub')
      expect(info.icon).toBe('Github')
      expect(info.docsUrl).toContain('github.com')
    })

    it('should return GitLab info', () => {
      const info = getProviderInfo('gitlab')
      expect(info.name).toBe('GitLab')
      expect(info.icon).toBe('Gitlab')
      expect(info.docsUrl).toContain('gitlab.com')
    })

    it('should return Bitbucket info', () => {
      const info = getProviderInfo('bitbucket')
      expect(info.name).toBe('Bitbucket')
      expect(info.icon).toBe('Server')
      expect(info.docsUrl).toContain('bitbucket')
    })
  })

  describe('validateTokenFormat', () => {
    it('should validate GitHub token format', () => {
      const validToken = 'ghp_' + 'a'.repeat(36)
      expect(validateTokenFormat(validToken, 'github')).toBe(true)

      const invalidToken = 'ghp_' + 'a'.repeat(20)
      expect(validateTokenFormat(invalidToken, 'github')).toBe(false)

      expect(validateTokenFormat('invalid', 'github')).toBe(false)
    })

    it('should validate GitLab token format', () => {
      const validToken = 'glpat-' + 'a'.repeat(20)
      expect(validateTokenFormat(validToken, 'gitlab')).toBe(true)

      const invalidToken = 'glpat-short'
      expect(validateTokenFormat(invalidToken, 'gitlab')).toBe(false)
    })

    it('should validate Bitbucket token format', () => {
      const validToken = 'a'.repeat(32)
      expect(validateTokenFormat(validToken, 'bitbucket')).toBe(true)

      const invalidToken = 'a'.repeat(20)
      expect(validateTokenFormat(invalidToken, 'bitbucket')).toBe(false)
    })

    it('should return false for empty tokens', () => {
      expect(validateTokenFormat('', 'github')).toBe(false)
      expect(validateTokenFormat('', 'gitlab')).toBe(false)
      expect(validateTokenFormat('', 'bitbucket')).toBe(false)
    })
  })

  describe('formatRepoUrl', () => {
    it('should return short URLs unchanged', () => {
      const url = 'https://github.com/user/repo.git'
      expect(formatRepoUrl(url)).toBe(url)
    })

    it('should truncate long URLs', () => {
      const longUrl = 'https://github.com/verylongorganizationname/verylongreponame.git'
      const formatted = formatRepoUrl(longUrl, 50)
      expect(formatted.length).toBeLessThanOrEqual(50)
      expect(formatted).toContain('...')
      expect(formatted).toContain('me.git') // End of URL
    })

    it('should use default max length of 50', () => {
      const longUrl = 'https://github.com/' + 'a'.repeat(60) + '/repo.git'
      const formatted = formatRepoUrl(longUrl)
      expect(formatted.length).toBeLessThanOrEqual(50)
    })

    it('should preserve start and end of URL', () => {
      const longUrl = 'https://github.com/verylongorganizationname/verylongreponame.git'
      const formatted = formatRepoUrl(longUrl, 40)
      expect(formatted).toMatch(/^https:\/\//)
      expect(formatted).toContain('...')
      expect(formatted).toMatch(/\.git$/)
    })
  })

  describe('getProviderIcon', () => {
    it('should return correct icon names', () => {
      expect(getProviderIcon('github')).toBe('Github')
      expect(getProviderIcon('gitlab')).toBe('Gitlab')
      expect(getProviderIcon('bitbucket')).toBe('Server')
    })
  })
})
