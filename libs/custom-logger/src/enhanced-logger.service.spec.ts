import { ClsService } from 'nestjs-cls'
import { PinoLogger } from 'nestjs-pino'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EnhancedLogger } from './enhanced-logger.service'

describe('EnhancedLogger', () => {
  let logger: EnhancedLogger
  let mockPinoLogger: any
  let mockClsService: any

  beforeEach(() => {
    // Mock PinoLogger methods
    mockPinoLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    }

    // Mock ClsService
    mockClsService = {
      get: vi.fn().mockReturnValue(undefined),
    }

    logger = new EnhancedLogger(mockPinoLogger, mockClsService)
  })

  describe('instantiation', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined()
    })

    it('should initialize with empty metadata', () => {
      expect(logger).toHaveProperty('metadata')
    })
  })

  describe('log method', () => {
    it('should log string message', () => {
      logger.log('test message')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), 'test message')
    })

    it('should log object as JSON string', () => {
      const obj = { key: 'value' }
      logger.log(obj)
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should include context in log data', () => {
      logger.log('test', 'MyContext')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({ context: 'MyContext' }), 'test')
    })

    it('should include traceId when present in cls', () => {
      mockClsService.get.mockReturnValue('trace-123')
      logger.log('test message')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'trace-123' }),
        'test message'
      )
    })

    it('should not include traceId when not present in cls', () => {
      mockClsService.get.mockReturnValue(undefined)
      logger.log('test message')
      const callArgs = mockPinoLogger.info.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('traceId')
    })
  })

  describe('error method', () => {
    it('should log string error message', () => {
      logger.error('error message')
      expect(mockPinoLogger.error).toHaveBeenCalledWith(expect.any(Object), 'error message')
    })

    it('should log Error object with stack trace', () => {
      const error = new Error('Something went wrong')
      logger.error(error)
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: error.stack,
          name: 'Error',
        }),
        'Something went wrong'
      )
    })

    it('should include trace parameter', () => {
      logger.error('error', 'trace info', 'ErrorContext')
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          trace: 'trace info',
          context: 'ErrorContext',
        }),
        'error'
      )
    })

    it('should log object error as JSON string', () => {
      const errorObj = { message: 'error', code: 500 }
      logger.error(errorObj)
      expect(mockPinoLogger.error).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(errorObj))
    })

    it('should handle Error with custom name', () => {
      const customError = new Error('Custom error')
      customError.name = 'CustomError'
      logger.error(customError)
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'CustomError',
        }),
        'Custom error'
      )
    })

    it('should not include stack for non-Error objects', () => {
      logger.error('error message')
      const callArgs = mockPinoLogger.error.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('stack')
      expect(callArgs).not.toHaveProperty('name')
    })
  })

  describe('warn method', () => {
    it('should log string warning message', () => {
      logger.warn('warning message')
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(expect.any(Object), 'warning message')
    })

    it('should log object as JSON string', () => {
      const obj = { level: 'high' }
      logger.warn(obj)
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should include context', () => {
      logger.warn('warning', 'WarnContext')
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ context: 'WarnContext' }), 'warning')
    })
  })

  describe('debug method', () => {
    it('should log string debug message', () => {
      logger.debug('debug message')
      expect(mockPinoLogger.debug).toHaveBeenCalledWith(expect.any(Object), 'debug message')
    })

    it('should log object as JSON string', () => {
      const obj = { data: 'test' }
      logger.debug(obj)
      expect(mockPinoLogger.debug).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should include context', () => {
      logger.debug('debug', 'DebugContext')
      expect(mockPinoLogger.debug).toHaveBeenCalledWith(expect.objectContaining({ context: 'DebugContext' }), 'debug')
    })
  })

  describe('verbose method', () => {
    it('should log string verbose message', () => {
      logger.verbose('verbose message')
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(expect.any(Object), 'verbose message')
    })

    it('should log object as JSON string', () => {
      const obj = { verbose: true }
      logger.verbose(obj)
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should include context', () => {
      logger.verbose('verbose', 'VerboseContext')
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(
        expect.objectContaining({ context: 'VerboseContext' }),
        'verbose'
      )
    })
  })

  describe('info method', () => {
    it('should log string info message', () => {
      logger.info('info message')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), 'info message')
    })

    it('should log object as JSON string', () => {
      const obj = { info: 'test' }
      logger.info(obj)
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should pass additional arguments', () => {
      logger.info('message', 'arg1', 'arg2')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), 'message', 'arg1', 'arg2')
    })
  })

  describe('fatal method', () => {
    it('should log string fatal message', () => {
      logger.fatal('fatal error')
      expect(mockPinoLogger.fatal).toHaveBeenCalledWith(expect.any(Object), 'fatal error')
    })

    it('should log object as JSON string', () => {
      const obj = { fatal: true }
      logger.fatal(obj)
      expect(mockPinoLogger.fatal).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should pass additional arguments', () => {
      logger.fatal('message', 'arg1')
      expect(mockPinoLogger.fatal).toHaveBeenCalledWith(expect.any(Object), 'message', 'arg1')
    })
  })

  describe('trace method', () => {
    it('should log string trace message', () => {
      logger.trace('trace message')
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(expect.any(Object), 'trace message')
    })

    it('should log object as JSON string', () => {
      const obj = { trace: 'details' }
      logger.trace(obj)
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })

    it('should pass additional arguments', () => {
      logger.trace('message', 'arg1', 'arg2')
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(expect.any(Object), 'message', 'arg1', 'arg2')
    })
  })

  describe('with method - metadata chaining', () => {
    it('should create child logger with additional metadata', () => {
      const childLogger = logger.with({ userId: '123' })
      expect(childLogger).toBeDefined()
      expect(childLogger).toBeInstanceOf(EnhancedLogger)
    })

    it('should not mutate original logger metadata', () => {
      const originalLogger = new EnhancedLogger(mockPinoLogger, mockClsService)
      const childLogger = originalLogger.with({ userId: '123' })

      childLogger.log('test')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({ userId: '123' }), 'test')

      mockPinoLogger.info.mockClear()
      originalLogger.log('test')
      const callArgs = mockPinoLogger.info.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('userId')
    })

    it('should merge metadata from parent and child', () => {
      const parentLogger = logger.with({ requestId: 'req-1' })
      const childLogger = parentLogger.with({ userId: 'user-1' })

      childLogger.log('test')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-1',
          userId: 'user-1',
        }),
        'test'
      )
    })

    it('should override parent metadata with child metadata', () => {
      const parentLogger = logger.with({ level: 'parent' })
      const childLogger = parentLogger.with({ level: 'child' })

      childLogger.log('test')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({ level: 'child' }), 'test')
    })

    it('should support chaining multiple with calls', () => {
      const logger2 = logger.with({ service: 'auth' }).with({ version: 'v1' }).with({ userId: '456' })

      logger2.log('test')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'auth',
          version: 'v1',
          userId: '456',
        }),
        'test'
      )
    })

    it('should include traceId in child logger', () => {
      mockClsService.get.mockReturnValue('trace-xyz')
      const childLogger = logger.with({ userId: '789' })

      childLogger.log('test')
      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'trace-xyz',
          userId: '789',
        }),
        'test'
      )
    })
  })

  describe('context propagation', () => {
    it('should include metadata in all log levels', () => {
      const loggerWithMeta = logger.with({ component: 'database' })

      loggerWithMeta.log('log message')
      loggerWithMeta.error('error message')
      loggerWithMeta.warn('warn message')
      loggerWithMeta.debug('debug message')
      loggerWithMeta.verbose('verbose message')
      loggerWithMeta.info('info message')
      loggerWithMeta.fatal('fatal message')

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'database' }),
        expect.any(String)
      )
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'database' }),
        expect.any(String)
      )
      expect(mockPinoLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'database' }),
        expect.any(String)
      )
      expect(mockPinoLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'database' }),
        expect.any(String)
      )
      expect(mockPinoLogger.trace).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'database' }),
        expect.any(String)
      )
      expect(mockPinoLogger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({ component: 'database' }),
        expect.any(String)
      )
    })
  })

  describe('message serialization', () => {
    it('should handle complex nested objects', () => {
      const complex = {
        user: { id: 1, name: 'John' },
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
      }
      logger.log(complex)
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(complex))
    })

    it('should handle arrays', () => {
      logger.log([1, 2, 3])
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), JSON.stringify([1, 2, 3]))
    })

    it('should handle null and undefined in objects', () => {
      const obj = { nullable: null, optional: undefined }
      logger.log(obj)
      expect(mockPinoLogger.info).toHaveBeenCalledWith(expect.any(Object), JSON.stringify(obj))
    })
  })
})
