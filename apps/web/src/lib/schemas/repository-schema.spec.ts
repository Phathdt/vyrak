import { describe, expect, it } from 'vitest'

import { gitRepositorySchema, testConnectionSchema, updateGitRepositorySchema } from './repository-schema'

describe('gitRepositorySchema', () => {
  describe('URL validation', () => {
    it('should accept valid HTTPS git URLs', () => {
      const validData = {
        name: 'test-repo',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(validData)).not.toThrow()
    })

    it('should reject non-HTTPS URLs', () => {
      const invalidData = {
        name: 'test-repo',
        url: 'http://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(invalidData)).toThrow()
    })

    it('should reject URLs without .git extension', () => {
      const invalidData = {
        name: 'test-repo',
        url: 'https://github.com/user/repo',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(invalidData)).toThrow()
    })

    it('should reject localhost URLs (SSRF prevention)', () => {
      const invalidData = {
        name: 'test-repo',
        url: 'https://localhost/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(invalidData)).toThrow('Cannot use local or private network URLs')
    })

    it('should reject 127.0.0.1 URLs (SSRF prevention)', () => {
      const invalidData = {
        name: 'test-repo',
        url: 'https://127.0.0.1/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(invalidData)).toThrow()
    })

    it('should reject private network URLs (SSRF prevention)', () => {
      const privateIPs = ['https://192.168.1.1/repo.git', 'https://10.0.0.1/repo.git', 'https://172.16.0.1/repo.git']

      privateIPs.forEach((url) => {
        const invalidData = {
          name: 'test-repo',
          url,
          branch: 'main',
          provider: 'github' as const,
        }
        expect(() => gitRepositorySchema.parse(invalidData)).toThrow()
      })
    })
  })

  describe('name validation', () => {
    it('should accept valid names', () => {
      const validNames = ['repo', 'my-repo', 'my_repo', 'repo123', 'REPO']
      validNames.forEach((name) => {
        const data = {
          name,
          url: 'https://github.com/user/repo.git',
          branch: 'main',
          provider: 'github' as const,
        }
        expect(() => gitRepositorySchema.parse(data)).not.toThrow()
      })
    })

    it('should reject names with spaces', () => {
      const data = {
        name: 'my repo',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })

    it('should reject names with special characters', () => {
      const data = {
        name: 'my@repo',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })

    it('should reject empty names', () => {
      const data = {
        name: '',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })

    it('should reject names over 100 characters', () => {
      const data = {
        name: 'a'.repeat(101),
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })
  })

  describe('branch validation', () => {
    it('should accept valid branch names', () => {
      const validBranches = ['main', 'develop', 'feature/new', 'fix-123', 'release_v1']
      validBranches.forEach((branch) => {
        const data = {
          name: 'test',
          url: 'https://github.com/user/repo.git',
          branch,
          provider: 'github' as const,
        }
        expect(() => gitRepositorySchema.parse(data)).not.toThrow()
      })
    })

    it('should reject branch with spaces', () => {
      const data = {
        name: 'test',
        url: 'https://github.com/user/repo.git',
        branch: 'my branch',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })
  })

  describe('provider validation', () => {
    it('should accept valid providers', () => {
      const providers = ['github', 'gitlab', 'bitbucket'] as const
      providers.forEach((provider) => {
        const data = {
          name: 'test',
          url: 'https://github.com/user/repo.git',
          branch: 'main',
          provider,
        }
        expect(() => gitRepositorySchema.parse(data)).not.toThrow()
      })
    })

    it('should reject invalid providers', () => {
      const data = {
        name: 'test',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'invalid',
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })
  })

  describe('accessToken validation', () => {
    it('should accept optional token', () => {
      const data = {
        name: 'test',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
      }
      expect(() => gitRepositorySchema.parse(data)).not.toThrow()
    })

    it('should accept valid token length', () => {
      const data = {
        name: 'test',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
        accessToken: 'a'.repeat(40),
      }
      expect(() => gitRepositorySchema.parse(data)).not.toThrow()
    })

    it('should reject tokens too short', () => {
      const data = {
        name: 'test',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
        accessToken: 'short',
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })

    it('should reject tokens too long', () => {
      const data = {
        name: 'test',
        url: 'https://github.com/user/repo.git',
        branch: 'main',
        provider: 'github' as const,
        accessToken: 'a'.repeat(300),
      }
      expect(() => gitRepositorySchema.parse(data)).toThrow()
    })
  })
})

describe('updateGitRepositorySchema', () => {
  it('should allow partial updates', () => {
    const data = {
      name: 'new-name',
    }
    expect(() => updateGitRepositorySchema.parse(data)).not.toThrow()
  })

  it('should not allow url updates', () => {
    const schema = updateGitRepositorySchema
    const parsed = schema.parse({ name: 'test' })
    expect(parsed).not.toHaveProperty('url')
  })

  it('should not allow provider updates', () => {
    const schema = updateGitRepositorySchema
    const parsed = schema.parse({ name: 'test' })
    expect(parsed).not.toHaveProperty('provider')
  })
})

describe('testConnectionSchema', () => {
  it('should accept valid test connection data', () => {
    const data = {
      url: 'https://github.com/user/repo.git',
      branch: 'main',
    }
    expect(() => testConnectionSchema.parse(data)).not.toThrow()
  })

  it('should accept test connection with token', () => {
    const data = {
      url: 'https://github.com/user/repo.git',
      branch: 'main',
      accessToken: 'a'.repeat(40),
    }
    expect(() => testConnectionSchema.parse(data)).not.toThrow()
  })

  it('should reject invalid URLs', () => {
    const data = {
      url: 'https://localhost/repo.git',
      branch: 'main',
    }
    expect(() => testConnectionSchema.parse(data)).toThrow()
  })
})
