import { describe, expect, it } from 'vitest'

import { InvalidRepositoryUrlError } from '../../domain/exceptions'
import { GitHubUrlParser } from './github-url-parser'

describe('GitHubUrlParser', () => {
  const parser = new GitHubUrlParser()

  describe('HTTPS format', () => {
    it('should parse HTTPS URL without .git suffix', () => {
      const result = parser.parse('https://github.com/octocat/hello-world')
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' })
    })

    it('should parse HTTPS URL with .git suffix', () => {
      const result = parser.parse('https://github.com/octocat/hello-world.git')
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' })
    })
  })

  describe('SSH format', () => {
    it('should parse SSH URL with .git suffix', () => {
      const result = parser.parse('git@github.com:octocat/hello-world.git')
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' })
    })

    it('should parse SSH URL without .git suffix', () => {
      const result = parser.parse('git@github.com:octocat/hello-world')
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' })
    })
  })

  describe('Shorthand format', () => {
    it('should parse owner/repo shorthand', () => {
      const result = parser.parse('octocat/hello-world')
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' })
    })
  })

  describe('Whitespace handling', () => {
    it('should trim whitespace from URL', () => {
      const result = parser.parse('  https://github.com/octocat/hello-world  ')
      expect(result).toEqual({ owner: 'octocat', repo: 'hello-world' })
    })
  })

  describe('Invalid formats', () => {
    it('should throw for empty string', () => {
      expect(() => parser.parse('')).toThrow(InvalidRepositoryUrlError)
    })

    it('should throw for invalid URL', () => {
      expect(() => parser.parse('not-a-valid-url')).toThrow(InvalidRepositoryUrlError)
    })

    it('should throw for non-GitHub URL', () => {
      expect(() => parser.parse('https://gitlab.com/octocat/hello-world')).toThrow(InvalidRepositoryUrlError)
    })

    it('should throw for incomplete shorthand', () => {
      expect(() => parser.parse('octocat')).toThrow(InvalidRepositoryUrlError)
    })

    it('should throw for URL with extra path segments', () => {
      expect(() => parser.parse('https://github.com/octocat/hello-world/issues')).toThrow(InvalidRepositoryUrlError)
    })
  })
})
