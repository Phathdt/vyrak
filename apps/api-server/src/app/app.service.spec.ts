import { Logger } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppService } from './app.service'

describe('AppService', () => {
  let service: AppService
  let databaseService: DatabaseService
  let loggerSpyError: any

  beforeEach(() => {
    databaseService = {
      healthCheck: vi.fn(),
    } as any

    service = new AppService(databaseService)

    // Spy on logger.error
    loggerSpyError = vi.spyOn(service['logger'], 'error')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ping', () => {
    it('should return pong with db healthy when database health check passes', async () => {
      vi.mocked(databaseService.healthCheck).mockResolvedValue(true)

      const result = await service.ping()

      expect(result).toEqual({ msg: 'pong', db: true })
      expect(databaseService.healthCheck).toHaveBeenCalled()
      expect(loggerSpyError).not.toHaveBeenCalled()
    })

    it('should return pong with db unhealthy when database health check fails', async () => {
      vi.mocked(databaseService.healthCheck).mockResolvedValue(false)

      const result = await service.ping()

      expect(result).toEqual({ msg: 'pong', db: false })
      expect(databaseService.healthCheck).toHaveBeenCalled()
      expect(loggerSpyError).toHaveBeenCalledWith('Database health check failed')
    })

    it('should log error when database is unhealthy', async () => {
      vi.mocked(databaseService.healthCheck).mockResolvedValue(false)

      await service.ping()

      expect(loggerSpyError).toHaveBeenCalledWith('Database health check failed')
    })

    it('should not log error when database is healthy', async () => {
      vi.mocked(databaseService.healthCheck).mockResolvedValue(true)

      await service.ping()

      expect(loggerSpyError).not.toHaveBeenCalled()
    })

    it('should call database healthCheck exactly once', async () => {
      vi.mocked(databaseService.healthCheck).mockResolvedValue(true)

      await service.ping()

      expect(databaseService.healthCheck).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple consecutive ping calls', async () => {
      vi.mocked(databaseService.healthCheck)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const result1 = await service.ping()
      const result2 = await service.ping()
      const result3 = await service.ping()

      expect(result1).toEqual({ msg: 'pong', db: true })
      expect(result2).toEqual({ msg: 'pong', db: false })
      expect(result3).toEqual({ msg: 'pong', db: true })
      expect(databaseService.healthCheck).toHaveBeenCalledTimes(3)
    })

    it('should have correct return type structure', async () => {
      vi.mocked(databaseService.healthCheck).mockResolvedValue(true)

      const result = await service.ping()

      expect(result).toHaveProperty('msg')
      expect(result).toHaveProperty('db')
      expect(typeof result.msg).toBe('string')
      expect(typeof result.db).toBe('boolean')
    })
  })

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should have ping method', () => {
      expect(typeof service.ping).toBe('function')
    })

    it('should be injectable with DatabaseService', () => {
      expect(service['db']).toBeDefined()
      expect(service['db']).toEqual(databaseService)
    })

    it('should have a logger instance', () => {
      expect(service['logger']).toBeDefined()
      expect(service['logger']).toBeInstanceOf(Logger)
    })
  })
})
