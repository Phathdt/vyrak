import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomConfigService } from './custom-config.service'

vi.mock('fs')
vi.mock('js-yaml')

describe('CustomConfigService', () => {
  let service: CustomConfigService
  const mockConfigYaml = {
    host: {
      port: 3000,
    },
    database: {
      url: 'postgresql://localhost/test',
    },
    redis: {
      url: 'redis://localhost:6379',
    },
    log: {
      level: 'info',
      enable_json_format: false,
    },
    frontend_url: 'http://localhost:5173',
    jwt: {
      secret: 'test-secret',
      expiry: '1h',
    },
    anthropic: {
      api_key: 'test-key',
      model: 'claude-3-5-sonnet-20241022',
    },
    s3: {
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      bucket: 'test-bucket',
      access_key_id: 'test',
      secret_access_key: 'test',
      force_path_style: true,
    },
    git: {
      token: '',
      user_name: 'vyrak-bot',
      user_email: 'vyrak-bot@users.noreply.github.com',
    },
    worker: {
      chat_concurrency: 5,
      execution_concurrency: 1,
    },
    workspace: {
      mode: 'worktree',
      workspaces_path: '/tmp/workspaces',
      main_repos_path: '/var/vyrak/repos',
    },
  }

  const setupMocks = (config = mockConfigYaml) => {
    // Mock fs.existsSync to return true for project root checks
    vi.mocked(fs.existsSync).mockImplementation((filePath: string | Buffer) => {
      const pathStr = typeof filePath === 'string' ? filePath : filePath.toString()
      if (pathStr.includes('config') || pathStr.includes('package.json') || pathStr.includes('pnpm-workspace.yaml')) {
        return true
      }
      return false
    })

    // Mock fs.readFileSync
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config))

    // Mock yaml.load
    vi.mocked(yaml.load).mockReturnValue(config as any)

    // Mock process.cwd
    vi.spyOn(process, 'cwd').mockReturnValue('/project')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    // Clear all env vars that match our pattern
    Object.keys(process.env).forEach((key) => {
      if (key.match(/^(HOST|DATABASE|REDIS|LOG|ALLOWED|GIT|WORKER)/)) {
        delete process.env[key]
      }
    })
    process.env.APP_ENV = 'local'
    setupMocks()
  })

  afterEach(() => {
    delete process.env.APP_ENV
    Object.keys(process.env).forEach((key) => {
      if (key.match(/^(HOST|DATABASE|REDIS|LOG|ALLOWED|GIT|WORKER)/)) {
        delete process.env[key]
      }
    })
  })

  it('should be defined', () => {
    service = new CustomConfigService()
    expect(service).toBeDefined()
  })

  describe('config loading', () => {
    it('should load configuration from yaml file', () => {
      service = new CustomConfigService()
      expect(service.host.port).toBe(3000)
      expect(service.database.url).toBe('postgresql://localhost/test')
    })

    it('should use APP_ENV to determine config file', () => {
      process.env.APP_ENV = 'development'
      service = new CustomConfigService()
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('development.yaml'), 'utf8')
    })

    it('should use "local" as default APP_ENV', () => {
      delete process.env.APP_ENV
      service = new CustomConfigService()
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('local.yaml'), 'utf8')
    })

    it('should throw error if config file not found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      expect(() => {
        new CustomConfigService()
      }).toThrow('Configuration file not found')
    })

    it('should throw error if config yaml is invalid', () => {
      vi.mocked(yaml.load).mockReturnValue(null as any)
      expect(() => {
        new CustomConfigService()
      }).toThrow('Invalid YAML configuration format')
    })

    it('should throw error if config is not an object', () => {
      vi.mocked(yaml.load).mockReturnValue('invalid' as any)
      expect(() => {
        new CustomConfigService()
      }).toThrow('Invalid YAML configuration format')
    })
  })

  describe('environment variable override', () => {
    it('should override config with environment variables', () => {
      setupMocks()
      process.env.DATABASE__URL = 'postgresql://prod/db'
      service = new CustomConfigService()
      expect(service.database.url).toBe('postgresql://prod/db')
    })

    it('should convert camelCase keys to UPPER_SNAKE_CASE for env lookup', () => {
      setupMocks()
      process.env.HOST__PORT = '8080'
      service = new CustomConfigService()
      expect(service.host.port).toBe(8080)
    })

    it('should parse number env values', () => {
      setupMocks()
      process.env.HOST__PORT = '5000'
      service = new CustomConfigService()
      expect(service.host.port).toBe(5000)
      expect(typeof service.host.port).toBe('number')
    })

    it('should override git config with GIT__ environment variables', () => {
      setupMocks()
      process.env.GIT__TOKEN = 'ghp_env_token'
      process.env.GIT__USER_NAME = 'env-bot'
      process.env.GIT__USER_EMAIL = 'env-bot@example.com'
      service = new CustomConfigService()
      expect(service.git).toEqual({
        token: 'ghp_env_token',
        userName: 'env-bot',
        userEmail: 'env-bot@example.com',
      })
    })

    it('should keep git config from YAML when GIT__ variables are absent', () => {
      setupMocks()
      service = new CustomConfigService()
      expect(service.git).toEqual({
        token: '',
        userName: 'vyrak-bot',
        userEmail: 'vyrak-bot@users.noreply.github.com',
      })
    })

    it('should override worker chat concurrency with WORKER__CHAT_CONCURRENCY', () => {
      setupMocks()
      process.env.WORKER__CHAT_CONCURRENCY = '8'
      service = new CustomConfigService()
      expect(service.worker.chatConcurrency).toBe(8)
    })

    it('should keep worker chat concurrency from YAML when WORKER__ variables are absent', () => {
      setupMocks()
      service = new CustomConfigService()
      expect(service.worker).toEqual({ chatConcurrency: 5, executionConcurrency: 1 })
    })

    it('should override worker execution concurrency with WORKER__EXECUTION_CONCURRENCY', () => {
      setupMocks()
      process.env.WORKER__EXECUTION_CONCURRENCY = '2'
      service = new CustomConfigService()
      expect(service.worker.executionConcurrency).toBe(2)
    })

    it('should accept FRONTEND__URL alias for top-level frontendUrl', () => {
      const config = {
        ...mockConfigYaml,
        frontend_url: 'replace_me',
      }
      setupMocks(config)
      process.env.FRONTEND__URL = 'http://localhost:5173'
      service = new CustomConfigService()
      expect(service.frontendUrl).toBe('http://localhost:5173')
    })
  })

  describe('config validation', () => {
    it('should validate required fields are present', () => {
      setupMocks()
      expect(() => {
        new CustomConfigService()
      }).not.toThrow()
    })

    it('should throw error if database.url is missing', () => {
      const invalidConfig = {
        ...mockConfigYaml,
        database: { url: '' },
      }
      setupMocks(invalidConfig)
      expect(() => {
        new CustomConfigService()
      }).toThrow('database.url must be configured')
    })

    it('should throw error if database.url is placeholder', () => {
      const invalidConfig = {
        ...mockConfigYaml,
        database: { url: 'replace_me' },
      }
      setupMocks(invalidConfig)
      expect(() => {
        new CustomConfigService()
      }).toThrow('database.url must be configured')
    })

    it('should throw error if host.port is invalid', () => {
      const invalidConfig = {
        ...mockConfigYaml,
        host: { port: 0 },
      }
      setupMocks(invalidConfig)
      expect(() => {
        new CustomConfigService()
      }).toThrow('host.port must be a positive number')
    })

    it('should throw error if host.port is missing', () => {
      const invalidConfig = {
        ...mockConfigYaml,
        host: {},
      }
      setupMocks(invalidConfig)
      expect(() => {
        new CustomConfigService()
      }).toThrow('host.port must be a positive number')
    })

    it('should throw error if redis.url is missing', () => {
      const invalidConfig = {
        ...mockConfigYaml,
        redis: { url: null },
      }
      setupMocks(invalidConfig)
      expect(() => {
        new CustomConfigService()
      }).toThrow('redis.url must be configured')
    })

    it('should throw error with multiple validation errors', () => {
      const invalidConfig = {
        database: { url: '' },
        host: { port: -1 },
        redis: { url: null },
        log: { level: 'info', enableJsonFormat: false },
      }
      setupMocks(invalidConfig)
      expect(() => {
        new CustomConfigService()
      }).toThrow('Configuration validation failed')
    })
  })

  describe('get method', () => {
    beforeEach(() => {
      setupMocks()
      service = new CustomConfigService()
    })

    it('should get top-level config value', () => {
      expect(service.get('database')).toEqual({ url: 'postgresql://localhost/test' })
    })

    it('should get nested config value with dot notation', () => {
      expect(service.get('database.url')).toBe('postgresql://localhost/test')
      expect(service.get('host.port')).toBe(3000)
    })

    it('should return undefined for non-existent keys', () => {
      expect(service.get('nonexistent')).toBeUndefined()
      expect(service.get('database.nonexistent')).toBeUndefined()
    })

    it('should return undefined for invalid dot notation path', () => {
      expect(service.get('database.url.invalid')).toBeUndefined()
    })

    it('should support deep nested access', () => {
      expect(service.get('log.level')).toBe('info')
    })

    it('should return values with correct types', () => {
      expect(typeof service.get('host.port')).toBe('number')
      expect(typeof service.get('database.url')).toBe('string')
    })
  })

  describe('interface properties', () => {
    beforeEach(() => {
      service = new CustomConfigService()
    })

    it('should expose config as direct properties', () => {
      expect(service.host).toBeDefined()
      expect(service.database).toBeDefined()
      expect(service.redis).toBeDefined()
      expect(service.log).toBeDefined()
    })

    it('should access nested properties directly', () => {
      expect(service.host.port).toBe(3000)
      expect(service.database.url).toBe('postgresql://localhost/test')
      expect(service.redis.url).toBe('redis://localhost:6379')
      expect(service.log.level).toBe('info')
    })

    it('should use proxy for nested object access', () => {
      const hostProxy = service.host
      expect(hostProxy.port).toBe(3000)
    })

    it('should cache proxy objects', () => {
      const host1 = service.host
      const host2 = service.host
      expect(host1).toBe(host2)
    })
  })

  describe('anthropic config normalization', () => {
    it('should normalize empty apiUrl after trim', () => {
      const config = {
        ...mockConfigYaml,
        anthropic: {
          ...mockConfigYaml.anthropic,
          api_url: '  ',
        },
      }
      setupMocks(config)
      service = new CustomConfigService()
      expect(service.anthropic?.apiUrl).toBeUndefined()
    })

    it('should normalize replace_me apiUrl', () => {
      const config = {
        ...mockConfigYaml,
        anthropic: {
          ...mockConfigYaml.anthropic,
          api_url: 'replace_me',
        },
      }
      setupMocks(config)
      service = new CustomConfigService()
      expect(service.anthropic?.apiUrl).toBeUndefined()
    })

    it('should keep valid apiUrl', () => {
      const config = {
        ...mockConfigYaml,
        anthropic: {
          ...mockConfigYaml.anthropic,
          api_url: 'https://api.anthropic.com',
        },
      }
      setupMocks(config)
      service = new CustomConfigService()
      expect(service.anthropic?.apiUrl).toBe('https://api.anthropic.com')
    })

    it('should default authScheme to x-api-key when missing', () => {
      const config = {
        ...mockConfigYaml,
        anthropic: {
          api_key: 'test-key',
          model: 'claude-3-5-sonnet-20241022',
        },
      }
      setupMocks(config)
      service = new CustomConfigService()
      expect(service.anthropic?.authScheme).toBe('x-api-key')
    })

    it('should accept bearer authScheme', () => {
      const config = {
        ...mockConfigYaml,
        anthropic: {
          ...mockConfigYaml.anthropic,
          auth_scheme: 'bearer',
        },
      }
      setupMocks(config)
      service = new CustomConfigService()
      expect(service.anthropic?.authScheme).toBe('bearer')
    })

    it('should throw error for invalid authScheme', () => {
      const config = {
        ...mockConfigYaml,
        anthropic: {
          ...mockConfigYaml.anthropic,
          auth_scheme: 'invalid',
        },
      }
      setupMocks(config)
      expect(() => {
        new CustomConfigService()
      }).toThrow('Invalid anthropic.authScheme')
    })
  })

  describe('workspace validation', () => {
    it('should validate workspace mode is worktree', () => {
      const config = {
        ...mockConfigYaml,
        workspace: {
          ...mockConfigYaml.workspace,
          mode: 'clone',
        },
      }
      setupMocks(config)
      expect(() => {
        new CustomConfigService()
      }).toThrow('workspace.mode must be "worktree"')
    })

    it('should validate workspace mainReposPath', () => {
      const config = {
        ...mockConfigYaml,
        workspace: {
          ...mockConfigYaml.workspace,
          main_repos_path: '',
        },
      }
      setupMocks(config)
      expect(() => {
        new CustomConfigService()
      }).toThrow('workspace.mainReposPath must be configured')
    })
  })

  describe('s3 config validation', () => {
    it('should validate s3 endpoint', () => {
      const config = {
        ...mockConfigYaml,
        s3: {
          ...mockConfigYaml.s3,
          endpoint: '',
        },
      }
      setupMocks(config)
      expect(() => {
        new CustomConfigService()
      }).toThrow('s3.endpoint must be configured')
    })

    it('should validate s3 bucket', () => {
      const config = {
        ...mockConfigYaml,
        s3: {
          ...mockConfigYaml.s3,
          bucket: 'replace_me',
        },
      }
      setupMocks(config)
      expect(() => {
        new CustomConfigService()
      }).toThrow('s3.bucket must be configured')
    })

    it('should validate s3 credentials', () => {
      const config = {
        ...mockConfigYaml,
        s3: {
          ...mockConfigYaml.s3,
          access_key_id: null,
        },
      }
      setupMocks(config)
      expect(() => {
        new CustomConfigService()
      }).toThrow('s3.accessKeyId must be configured')
    })
  })

  describe('env array parsing', () => {
    it('should parse comma-separated arrays', () => {
      const config = {
        ...mockConfigYaml,
        allowed_origins: ['http://localhost:3000'],
      }
      setupMocks(config)
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173'
      service = new CustomConfigService()
      const origins = service.get<string[]>('allowedOrigins')
      expect(origins).toEqual(['http://localhost:3000', 'http://localhost:5173'])
    })

    it('should handle empty array env value', () => {
      const config = {
        ...mockConfigYaml,
        allowed_origins: [],
      }
      setupMocks(config)
      process.env.ALLOWED_ORIGINS = ''
      service = new CustomConfigService()
      const origins = service.get<string[]>('allowedOrigins')
      expect(origins).toEqual([])
    })
  })

  describe('camelCase conversion', () => {
    it('should convert snake_case keys to camelCase', () => {
      const snakeCaseConfig = {
        host: { port: 3000 },
        database: { url: 'postgresql://localhost/test' },
        redis: { url: 'redis://localhost:6379' },
        log: { level: 'info', enableJsonFormat: false },
        frontend_url: 'http://localhost:5173',
      }
      setupMocks(snakeCaseConfig)

      service = new CustomConfigService()

      expect(service.get('database.url')).toBe('postgresql://localhost/test')
      expect(service.host.port).toBe(3000)
    })

    it('should handle deeply nested objects', () => {
      const config = {
        host: { port: 3000 },
        database: { url: 'postgresql://localhost/test' },
        redis: { url: 'redis://localhost:6379' },
        log: { level: 'info', enableJsonFormat: false },
        frontend_url: 'http://localhost:5173',
      }
      setupMocks(config)

      service = new CustomConfigService()

      expect(service.get('database.url')).toBe('postgresql://localhost/test')
      expect(service.get('log.level')).toBe('info')
    })
  })
})
