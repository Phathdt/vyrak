import { Test } from '@nestjs/testing'
import { CustomConfigService } from '@vyrak/custom-config'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DatabaseModule } from './database.module'
import { DatabaseService } from './database.service'

const mockConfigService = {
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  log: {
    level: 'info',
    enableJsonFormat: false,
  },
  get: vi.fn((key: string) => {
    if (key === 'database.url') {
      return 'postgresql://test:test@localhost:5432/test'
    }
    if (key === 'log.level') {
      return 'info'
    }
    if (key === 'log.enableJsonFormat') {
      return false
    }
    return undefined
  }),
}

describe('DatabaseModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SKIP_DB_CONNECTION = 'true'
  })

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(DatabaseModule).toBeDefined()
    })

    it('should export DatabaseService', async () => {
      const module = await Test.createTestingModule({
        imports: [DatabaseModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockConfigService)
        .compile()

      const service = module.get(DatabaseService)
      expect(service).toBeDefined()
      expect(service instanceof DatabaseService).toBe(true)
    })

    it('should provide DatabaseService as singleton', async () => {
      const module = await Test.createTestingModule({
        imports: [DatabaseModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockConfigService)
        .compile()

      const service1 = module.get(DatabaseService)
      const service2 = module.get(DatabaseService)

      expect(service1).toBe(service2)
    })

    it('should support module initialization', async () => {
      const module = await Test.createTestingModule({
        imports: [DatabaseModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockConfigService)
        .compile()

      await expect(module.init()).resolves.not.toThrow()
      await module.close()
    })
  })

  describe('Dependency Injection', () => {
    it('should be injectable by other modules', async () => {
      const testProvider = {
        provide: 'TEST_PROVIDER',
        inject: [DatabaseService],
        useFactory: (dbService: DatabaseService) => ({ dbService }),
      }

      const module = await Test.createTestingModule({
        imports: [DatabaseModule],
        providers: [testProvider],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockConfigService)
        .compile()

      const testProviderInstance = module.get('TEST_PROVIDER')
      expect(testProviderInstance).toBeDefined()
      expect(testProviderInstance.dbService instanceof DatabaseService).toBe(true)
    })
  })
})
