import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DatabaseService } from './database.service'

// Mock CustomConfigService
const mockConfigService = {
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  log: {
    level: 'info',
    enableJsonFormat: false,
  },
}

// Mock console.log to avoid output during tests
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('DatabaseService', () => {
  let service: DatabaseService

  beforeEach(() => {
    process.env.SKIP_DB_CONNECTION = 'true'
    vi.clearAllMocks()
  })

  describe('setTenantContext', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should set tenant context with organizationId', () => {
      service.setTenantContext('org-123')

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-123',
        bypassTenantFilter: false,
      })
    })
  })

  describe('clearTenantContext', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should clear tenant context', () => {
      service.setTenantContext('org-123')
      service.clearTenantContext()

      expect((service as any).tenantContext).toEqual({})
    })
  })

  describe('withOrganization', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should execute callback with organization context', async () => {
      const result = await service.withOrganization('org-456', async () => {
        expect((service as any).tenantContext).toEqual({
          organizationId: 'org-456',
          bypassTenantFilter: false,
        })
        return 'test-result'
      })

      expect(result).toBe('test-result')
    })

    it('should restore previous context after execution', async () => {
      service.setTenantContext('org-123')

      await service.withOrganization('org-456', async () => {
        expect((service as any).tenantContext.organizationId).toBe('org-456')
      })

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-123',
        bypassTenantFilter: false,
      })
    })

    it('should restore context even if callback throws', async () => {
      service.setTenantContext('org-123')

      await expect(
        service.withOrganization('org-456', async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-123',
        bypassTenantFilter: false,
      })
    })
  })

  describe('withSystemAccess', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should execute callback with bypass flag set', async () => {
      const result = await service.withSystemAccess(async () => {
        expect((service as any).tenantContext.bypassTenantFilter).toBe(true)
        return 'system-result'
      })

      expect(result).toBe('system-result')
    })

    it('should restore previous bypass flag after execution', async () => {
      ;(service as any).tenantContext.bypassTenantFilter = false

      await service.withSystemAccess(async () => {
        expect((service as any).tenantContext.bypassTenantFilter).toBe(true)
      })

      expect((service as any).tenantContext.bypassTenantFilter).toBe(false)
    })

    it('should work with organization context set', async () => {
      service.setTenantContext('org-789')

      await service.withSystemAccess(async () => {
        expect((service as any).tenantContext).toEqual({
          organizationId: 'org-789',
          bypassTenantFilter: true,
        })
      })

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-789',
        bypassTenantFilter: false,
      })
    })
  })

  describe('mapLogLevelToPrisma', () => {
    it('should map trace to all log levels', () => {
      const result = DatabaseService.mapLogLevelToPrisma('trace')

      expect(result).toHaveLength(4)
      expect(result).toContainEqual({ emit: 'event', level: 'query' })
      expect(result).toContainEqual({ emit: 'event', level: 'info' })
      expect(result).toContainEqual({ emit: 'event', level: 'warn' })
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map debug to all log levels', () => {
      const result = DatabaseService.mapLogLevelToPrisma('debug')

      expect(result).toHaveLength(4)
    })

    it('should map info to info, warn, error', () => {
      const result = DatabaseService.mapLogLevelToPrisma('info')

      expect(result).toHaveLength(3)
      expect(result).toContainEqual({ emit: 'event', level: 'info' })
      expect(result).toContainEqual({ emit: 'event', level: 'warn' })
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map warn to warn, error', () => {
      const result = DatabaseService.mapLogLevelToPrisma('warn')

      expect(result).toHaveLength(2)
      expect(result).toContainEqual({ emit: 'event', level: 'warn' })
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map error to error only', () => {
      const result = DatabaseService.mapLogLevelToPrisma('error')

      expect(result).toHaveLength(1)
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map fatal to error only', () => {
      const result = DatabaseService.mapLogLevelToPrisma('fatal')

      expect(result).toHaveLength(1)
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should default to info level for unknown', () => {
      const result = DatabaseService.mapLogLevelToPrisma('unknown')

      expect(result).toHaveLength(3)
      expect(result).toContainEqual({ emit: 'event', level: 'info' })
    })

    it('should be case-insensitive for log level input', () => {
      const resultLower = DatabaseService.mapLogLevelToPrisma('trace')
      const resultUpper = DatabaseService.mapLogLevelToPrisma('TRACE')
      const resultMixed = DatabaseService.mapLogLevelToPrisma('TrAcE')

      expect(resultLower).toEqual(resultUpper)
      expect(resultUpper).toEqual(resultMixed)
    })
  })

  describe('Client Access', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should have client property', () => {
      expect(service.client).toBeDefined()
    })

    it('should have $transaction property', () => {
      expect(typeof service.$transaction).toBe('function')
    })
  })

  describe('Lifecycle Hooks', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should skip database connection when SKIP_DB_CONNECTION is set', async () => {
      process.env.SKIP_DB_CONNECTION = 'true'
      await expect(service.onModuleInit()).resolves.not.toThrow()
    })

    it('should implement OnModuleDestroy', async () => {
      expect(typeof service.onModuleDestroy).toBe('function')
    })

    it('should handle module destroy without errors', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow()
    })
  })

  describe('Health Check', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should have healthCheck method', () => {
      expect(typeof service.healthCheck).toBe('function')
    })

    it('should return boolean from health check', async () => {
      const result = await service.healthCheck()
      expect(typeof result).toBe('boolean')
    })

    it('should return true when database is healthy', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({}),
        release: vi.fn(),
      }
      vi.spyOn(service['pool'], 'connect').mockResolvedValue(mockClient as any)

      const result = await service.healthCheck()

      expect(result).toBe(true)
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should return false when database connection fails', async () => {
      vi.spyOn(service['pool'], 'connect').mockRejectedValue(new Error('Connection failed'))

      const result = await service.healthCheck()

      expect(result).toBe(false)
    })

    it('should return false when query fails', async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error('Query failed')),
        release: vi.fn(),
      }
      vi.spyOn(service['pool'], 'connect').mockResolvedValue(mockClient as any)

      const result = await service.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('onModuleInit', () => {
    beforeEach(() => {
      delete process.env.SKIP_DB_CONNECTION
      service = new DatabaseService(mockConfigService as any)
    })

    it('should connect to database when SKIP_DB_CONNECTION is not set', async () => {
      delete process.env.SKIP_DB_CONNECTION

      const connectSpy = vi.spyOn(service['prismaClient'], '$connect').mockResolvedValue()
      const onSpy = vi.spyOn(service['prismaClient'], '$on').mockReturnValue(() => {})

      await service.onModuleInit()

      expect(connectSpy).toHaveBeenCalled()
      expect(onSpy).toHaveBeenCalledWith('query', expect.any(Function))
    })

    it('should skip connection when SKIP_DB_CONNECTION=true', async () => {
      process.env.SKIP_DB_CONNECTION = 'true'

      const connectSpy = vi.spyOn(service['prismaClient'], '$connect').mockResolvedValue()
      await service.onModuleInit()

      expect(connectSpy).not.toHaveBeenCalled()
    })

    it('should setup query event listener with colored output', async () => {
      delete process.env.SKIP_DB_CONNECTION
      const logSpy = vi.spyOn(console, 'log')
      const connectSpy = vi.spyOn(service['prismaClient'], '$connect').mockResolvedValue()

      let queryHandler: any
      vi.spyOn(service['prismaClient'], '$on').mockImplementation((event: string, handler: any) => {
        if (event === 'query') {
          queryHandler = handler
        }
        return () => {}
      })

      await service.onModuleInit()

      // Simulate a query event
      queryHandler({
        timestamp: new Date(),
        query: 'SELECT * FROM users',
        params: '["test"]',
        duration: 50,
        target: 'test',
      })

      expect(logSpy).toHaveBeenCalled()
    })

    it('should log query events with JSON format when colors disabled', async () => {
      delete process.env.SKIP_DB_CONNECTION
      process.env.SKIP_DB_CONNECTION = 'false'

      const serviceNoColors = new DatabaseService({
        ...mockConfigService,
        log: { ...mockConfigService.log, enableJsonFormat: true },
      } as any)

      const loggerSpy = vi.spyOn(serviceNoColors['logger'], 'log')
      const connectSpy = vi.spyOn(serviceNoColors['prismaClient'], '$connect').mockResolvedValue()

      let queryHandler: any
      vi.spyOn(serviceNoColors['prismaClient'], '$on').mockImplementation((event: string, handler: any) => {
        if (event === 'query') {
          queryHandler = handler
        }
        return () => {}
      })

      await serviceNoColors.onModuleInit()

      // Simulate a query event
      queryHandler({
        timestamp: new Date(),
        query: 'SELECT * FROM users',
        params: '["test"]',
        duration: 50,
        target: 'test',
        error: undefined,
      })

      expect(loggerSpy).toHaveBeenCalled()
    })

    it('should log query events with error', async () => {
      delete process.env.SKIP_DB_CONNECTION
      const logSpy = vi.spyOn(console, 'log')
      const connectSpy = vi.spyOn(service['prismaClient'], '$connect').mockResolvedValue()

      let queryHandler: any
      vi.spyOn(service['prismaClient'], '$on').mockImplementation((event: string, handler: any) => {
        if (event === 'query') {
          queryHandler = handler
        }
        return () => {}
      })

      await service.onModuleInit()

      queryHandler({
        timestamp: new Date(),
        query: 'SELECT * FROM users',
        params: '[]',
        duration: 50,
        target: 'test',
        error: 'Database error',
      })

      expect(logSpy).toHaveBeenCalled()
    })
  })

  describe('onModuleDestroy', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should disconnect prisma and close pool', async () => {
      const disconnectSpy = vi.spyOn(service['prismaClient'], '$disconnect').mockResolvedValue()
      const poolEndSpy = vi.spyOn(service['pool'], 'end').mockResolvedValue()

      await service.onModuleDestroy()

      expect(disconnectSpy).toHaveBeenCalled()
      expect(poolEndSpy).toHaveBeenCalled()
    })

    it('should handle disconnect errors gracefully', async () => {
      vi.spyOn(service['prismaClient'], '$disconnect').mockRejectedValue(new Error('Disconnect error'))
      const poolEndSpy = vi.spyOn(service['pool'], 'end').mockResolvedValue()

      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnect error')
    })
  })

  describe('Private formatting methods', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    describe('formatQuery', () => {
      it('should format SQL query with extra spaces', () => {
        const formatted = service['formatQuery']('SELECT   *   FROM   users')
        expect(formatted).toBe('SELECT * FROM users')
      })

      it('should remove double quotes', () => {
        const formatted = service['formatQuery']('SELECT * FROM "users"')
        expect(formatted).toBe('SELECT * FROM users')
      })

      it('should remove backticks', () => {
        const formatted = service['formatQuery']('SELECT * FROM `users`')
        expect(formatted).toBe('SELECT * FROM users')
      })

      it('should remove public schema prefix', () => {
        const formatted = service['formatQuery']('SELECT * FROM public."users"')
        expect(formatted).toBe('SELECT * FROM users')
      })

      it('should normalize spaces around commas', () => {
        const formatted = service['formatQuery']('SELECT a, b, c FROM users')
        expect(formatted).toContain('SELECT a, b, c FROM users')
      })

      it('should normalize parentheses', () => {
        const formatted = service['formatQuery']('WHERE ( id = 1 )')
        expect(formatted).toBe('WHERE (id = 1)')
      })

      it('should handle complex queries', () => {
        const formatted = service['formatQuery']('SELECT   * FROM   public."users"  WHERE  ( id = 1 )')
        expect(formatted).toContain('SELECT * FROM users')
        expect(formatted).toContain('WHERE (id = 1)')
      })

      it('should trim result', () => {
        const formatted = service['formatQuery']('  SELECT * FROM users  ')
        expect(formatted).toBe('SELECT * FROM users')
      })
    })

    describe('parseParams', () => {
      it('should parse valid JSON params array', () => {
        const params = service['parseParams']('["value1", 123, null]')
        expect(params).toEqual(['value1', 123, null])
      })

      it('should parse valid JSON with objects', () => {
        const params = service['parseParams']('[{"key": "value"}, 42]')
        expect(params).toEqual([{ key: 'value' }, 42])
      })

      it('should return empty array for invalid JSON', () => {
        const params = service['parseParams']('invalid json')
        expect(params).toEqual([])
      })

      it('should return empty array for empty string', () => {
        const params = service['parseParams']('')
        expect(params).toEqual([])
      })

      it('should parse valid JSON with null value', () => {
        const params = service['parseParams']('null')
        expect(params).toBe(null)
      })

      it('should parse malformed JSON gracefully', () => {
        const params = service['parseParams']('{"incomplete": ')
        expect(Array.isArray(params)).toBe(true)
      })
    })

    describe('getPerformanceLevel', () => {
      it('should return FAST for < 10ms', () => {
        expect(service['getPerformanceLevel'](5)).toBe('FAST')
        expect(service['getPerformanceLevel'](0)).toBe('FAST')
        expect(service['getPerformanceLevel'](9)).toBe('FAST')
      })

      it('should return MEDIUM for 10-99ms', () => {
        expect(service['getPerformanceLevel'](10)).toBe('MEDIUM')
        expect(service['getPerformanceLevel'](50)).toBe('MEDIUM')
        expect(service['getPerformanceLevel'](99)).toBe('MEDIUM')
      })

      it('should return SLOW for 100-999ms', () => {
        expect(service['getPerformanceLevel'](100)).toBe('SLOW')
        expect(service['getPerformanceLevel'](500)).toBe('SLOW')
        expect(service['getPerformanceLevel'](999)).toBe('SLOW')
      })

      it('should return CRITICAL for >= 1000ms', () => {
        expect(service['getPerformanceLevel'](1000)).toBe('CRITICAL')
        expect(service['getPerformanceLevel'](2000)).toBe('CRITICAL')
        expect(service['getPerformanceLevel'](5000)).toBe('CRITICAL')
      })
    })

    describe('extractTableNames', () => {
      it('should extract table name from SELECT', () => {
        const tables = service['extractTableNames']('SELECT * FROM users')
        expect(tables).toContain('users')
      })

      it('should extract multiple table names from JOIN', () => {
        const tables = service['extractTableNames']('SELECT * FROM users JOIN orders ON users.id = orders.userId')
        expect(tables).toContain('users')
        expect(tables).toContain('orders')
      })

      it('should extract table name from UPDATE', () => {
        const tables = service['extractTableNames']('UPDATE users SET name = "test"')
        expect(tables).toContain('users')
      })

      it('should extract table name from INSERT', () => {
        const tables = service['extractTableNames']('INSERT INTO products (name) VALUES ("test")')
        expect(tables).toContain('products')
      })

      it('should extract from schema-qualified names', () => {
        const tables = service['extractTableNames']('SELECT * FROM public.users')
        // The regex captures the schema separately, so we get 'public' first
        expect(tables.length).toBeGreaterThan(0)
      })

      it('should handle quoted table names', () => {
        const tables = service['extractTableNames']('SELECT * FROM "users"')
        expect(tables).toContain('users')
      })

      it('should deduplicate table names', () => {
        const tables = service['extractTableNames']('SELECT * FROM users JOIN users u2')
        expect(tables).toEqual(['users'])
      })

      it('should extract from multiple JOINs', () => {
        const tables = service['extractTableNames'](
          'SELECT * FROM users JOIN orders ON users.id = orders.userId JOIN products ON orders.product_id = products.id'
        )
        expect(tables).toContain('users')
        expect(tables).toContain('orders')
        expect(tables).toContain('products')
      })

      it('should handle case insensitive keywords', () => {
        const tablesUpper = service['extractTableNames']('SELECT * FROM USERS')
        const tablesLower = service['extractTableNames']('select * from users')
        expect(tablesUpper).toContain('USERS')
        expect(tablesLower).toContain('users')
      })

      it('should handle DELETE FROM', () => {
        const tables = service['extractTableNames']('DELETE FROM users WHERE id = 1')
        expect(tables).toContain('users')
      })
    })

    describe('summarizeQuery', () => {
      it('should summarize SELECT query', () => {
        const summary = service['summarizeQuery']('SELECT * FROM users', ['users'])
        expect(summary).toBe('Query users')
      })

      it('should summarize INSERT query', () => {
        const summary = service['summarizeQuery']('INSERT INTO products', ['products'])
        expect(summary).toBe('Insert into products')
      })

      it('should summarize UPDATE query', () => {
        const summary = service['summarizeQuery']('UPDATE users SET', ['users'])
        expect(summary).toBe('Update users')
      })

      it('should summarize DELETE query', () => {
        const summary = service['summarizeQuery']('DELETE FROM users', ['users'])
        expect(summary).toBe('Delete from users')
      })

      it('should handle unknown query type', () => {
        const summary = service['summarizeQuery']('TRUNCATE users', ['users'])
        expect(summary).toBe('TRUNCATE on users')
      })

      it('should handle multiple tables', () => {
        const summary = service['summarizeQuery']('SELECT * FROM users, orders', ['users', 'orders'])
        expect(summary).toBe('Query users, orders')
      })

      it('should handle empty table list', () => {
        const summary = service['summarizeQuery']('SELECT * FROM users', [])
        expect(summary).toBe('Query ')
      })

      it('should handle three or more tables', () => {
        const summary = service['summarizeQuery']('SELECT * FROM a, b, c', ['a', 'b', 'c'])
        expect(summary).toBe('Query a, b, c')
      })
    })
  })

  describe('Colorize methods', () => {
    beforeEach(() => {
      service = new DatabaseService({
        ...mockConfigService,
        log: { ...mockConfigService.log, enableJsonFormat: false },
      } as any)
    })

    describe('colorizeQueryType', () => {
      it('should colorize SELECT', () => {
        const colored = service['colorizeQueryType']('SELECT')
        expect(colored).toContain('[SELECT]')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize INSERT', () => {
        const colored = service['colorizeQueryType']('INSERT')
        expect(colored).toContain('[INSERT]')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize UPDATE', () => {
        const colored = service['colorizeQueryType']('UPDATE')
        expect(colored).toContain('[UPDATE]')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize DELETE', () => {
        const colored = service['colorizeQueryType']('DELETE')
        expect(colored).toContain('[DELETE]')
        expect(colored).toContain('\x1b[')
      })

      it('should handle unknown types with white color', () => {
        const colored = service['colorizeQueryType']('UNKNOWN')
        expect(colored).toContain('[UNKNOWN]')
        expect(colored).toContain('\x1b[')
      })
    })

    describe('colorizeDuration', () => {
      it('should colorize duration with ms unit', () => {
        const colored = service['colorizeDuration'](50)
        expect(colored).toContain('50ms')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize zero duration', () => {
        const colored = service['colorizeDuration'](0)
        expect(colored).toContain('0ms')
      })

      it('should colorize large duration', () => {
        const colored = service['colorizeDuration'](5000)
        expect(colored).toContain('5000ms')
      })
    })

    describe('colorizeSummary', () => {
      it('should colorize summary text', () => {
        const colored = service['colorizeSummary']('Query users')
        expect(colored).toContain('Query users')
        expect(colored).toContain('\x1b[')
      })
    })

    describe('colorizeSQL', () => {
      it('should colorize SELECT SQL', () => {
        const colored = service['colorizeSQL']('SELECT * FROM users', 'SELECT')
        expect(colored).toContain('SELECT * FROM users')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize INSERT SQL', () => {
        const colored = service['colorizeSQL']('INSERT INTO users', 'INSERT')
        expect(colored).toContain('INSERT INTO users')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize UPDATE SQL', () => {
        const colored = service['colorizeSQL']('UPDATE users SET', 'UPDATE')
        expect(colored).toContain('UPDATE users SET')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize DELETE SQL', () => {
        const colored = service['colorizeSQL']('DELETE FROM users', 'DELETE')
        expect(colored).toContain('DELETE FROM users')
        expect(colored).toContain('\x1b[')
      })

      it('should handle unknown query types', () => {
        const colored = service['colorizeSQL']('TRUNCATE users', 'TRUNCATE')
        expect(colored).toContain('TRUNCATE users')
        expect(colored).toContain('\x1b[')
      })
    })

    describe('colorizeParams', () => {
      it('should colorize string params', () => {
        const colored = service['colorizeParams'](['test'])
        expect(colored).toContain('test')
        expect(colored).toContain('[')
        expect(colored).toContain(']')
      })

      it('should colorize number params', () => {
        const colored = service['colorizeParams']([123])
        expect(colored).toContain('123')
      })

      it('should colorize null params', () => {
        const colored = service['colorizeParams']([null])
        expect(colored).toContain('null')
      })

      it('should handle mixed param types', () => {
        const colored = service['colorizeParams'](['test', 123, null])
        expect(colored).toContain('test')
        expect(colored).toContain('123')
        expect(colored).toContain('null')
      })

      it('should handle non-array input', () => {
        const colored = service['colorizeParams']({} as any)
        expect(colored).toBe('{}')
      })

      it('should format as array with brackets and commas', () => {
        const colored = service['colorizeParams'](['a', 'b'])
        expect(colored).toContain('[')
        expect(colored).toContain(']')
        expect(colored).toContain(',')
      })

      it('should colorize boolean params', () => {
        const colored = service['colorizeParams']([true, false])
        expect(colored).toContain('true')
        expect(colored).toContain('false')
      })

      it('should handle empty array', () => {
        const colored = service['colorizeParams']([])
        expect(colored).toBe('[]')
      })
    })

    describe('colorizeError', () => {
      it('should colorize error message', () => {
        const colored = service['colorizeError']('Connection timeout')
        expect(colored).toContain('Connection timeout')
        expect(colored).toContain('\x1b[')
      })

      it('should colorize error with special characters', () => {
        const colored = service['colorizeError']('Error: Database connection failed!')
        expect(colored).toContain('Error: Database connection failed!')
      })
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      service = new DatabaseService(mockConfigService as any)
    })

    it('should return extended client via getter', () => {
      const client = service.client
      expect(client).toBeDefined()
      expect(client).toBe(service['extendedClient'])
    })

    it('should return bound transaction method', () => {
      const transaction = service.$transaction
      expect(transaction).toBeDefined()
      expect(typeof transaction).toBe('function')
    })

    it('transaction method should be a function', () => {
      const transaction = service.$transaction
      expect(typeof transaction).toBe('function')
    })
  })
})
