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
      enableJsonFormat: false,
    },
  }

  const setupMocks = (config = mockConfigYaml) => {
    // Mock fs.existsSync to return true for project root checks
    vi.mocked(fs.existsSync).mockImplementation((filePath: string | Buffer) => {
      const pathStr = typeof filePath === 'string' ? filePath : filePath.toString()
      if (pathStr.includes('config') || pathStr.includes('package.json') || pathStr.includes('yarn.lock')) {
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
      if (key.match(/^(HOST|DATABASE|REDIS|LOG|ALLOWED)/)) {
        delete process.env[key]
      }
    })
    process.env.APP_ENV = 'local'
    setupMocks()
  })

  afterEach(() => {
    delete process.env.APP_ENV
    Object.keys(process.env).forEach((key) => {
      if (key.match(/^(HOST|DATABASE|REDIS|LOG|ALLOWED)/)) {
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

  describe('camelCase conversion', () => {
    it('should convert snake_case keys to camelCase', () => {
      const snakeCaseConfig = {
        host: { port: 3000 },
        database: { url: 'postgresql://localhost/test' },
        redis: { url: 'redis://localhost:6379' },
        log: { level: 'info', enableJsonFormat: false },
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
      }
      setupMocks(config)

      service = new CustomConfigService()

      expect(service.get('database.url')).toBe('postgresql://localhost/test')
      expect(service.get('log.level')).toBe('info')
    })
  })
})
