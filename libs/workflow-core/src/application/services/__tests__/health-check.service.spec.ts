import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HealthCheckService } from '../health-check.service'

describe('HealthCheckService', () => {
  let service: HealthCheckService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
    }
    service = new HealthCheckService(mockPrisma)
  })

  describe('checkLiveness', () => {
    it('should return ok status', async () => {
      const result = await service.checkLiveness()

      expect(result.status).toBe('ok')
      expect(result.timestamp).toBeDefined()
      expect(result.uptime).toBeGreaterThanOrEqual(0)
      expect(result.checks).toBeUndefined()
    })

    it('should return valid ISO timestamp', async () => {
      const result = await service.checkLiveness()

      expect(() => new Date(result.timestamp)).not.toThrow()
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
    })

    it('should track uptime correctly', async () => {
      const result1 = await service.checkLiveness()

      await new Promise((resolve) => setTimeout(resolve, 1100))

      const result2 = await service.checkLiveness()

      expect(result2.uptime).toBeGreaterThanOrEqual(result1.uptime + 1)
    })
  })

  describe('checkReadiness', () => {
    it('should return ok when all checks pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

      // Ensure required env vars are set
      const originalDatabaseUrl = process.env.DATABASE__URL
      const originalNodeEnv = process.env.NODE_ENV
      process.env.DATABASE__URL = 'postgresql://test'
      process.env.NODE_ENV = 'test'

      const result = await service.checkReadiness()

      expect(result.status).toBe('ok')
      expect(result.checks?.database?.status).toBe('up')
      expect(result.checks?.database?.responseTime).toBeGreaterThanOrEqual(0)
      expect(result.checks?.environment?.status).toBe('up')

      // Restore original env vars
      if (originalDatabaseUrl) process.env.DATABASE__URL = originalDatabaseUrl
      if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv
    })

    it('should return error when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'))

      const result = await service.checkReadiness()

      expect(result.status).toBe('error')
      expect(result.checks?.database?.status).toBe('down')
      expect(result.checks?.database?.error).toContain('Connection failed')
    })

    it('should measure database response time', async () => {
      mockPrisma.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([{ '?column?': 1 }]), 10)
          })
      )

      const result = await service.checkReadiness()

      expect(result.checks?.database?.responseTime).toBeGreaterThanOrEqual(5)
    })

    it('should detect missing environment variables', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

      const originalEnv = process.env.DATABASE__URL
      delete process.env.DATABASE__URL

      const result = await service.checkReadiness()

      expect(result.status).toBe('error')
      expect(result.checks?.environment?.status).toBe('down')
      expect(result.checks?.environment?.error).toContain('DATABASE__URL')

      process.env.DATABASE__URL = originalEnv
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection timeout'))

      const result = await service.checkReadiness()

      expect(result.status).toBe('error')
      expect(result.checks?.database?.status).toBe('down')
      expect(result.checks?.database?.error).toBe('Connection timeout')
      expect(result.checks?.database?.responseTime).toBeUndefined()
    })

    it('should handle non-Error exceptions', async () => {
      mockPrisma.$queryRaw.mockRejectedValue('String error')

      const result = await service.checkReadiness()

      expect(result.status).toBe('error')
      expect(result.checks?.database?.status).toBe('down')
      expect(result.checks?.database?.error).toBe('Unknown error')
    })

    it('should include timestamp and uptime in readiness check', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

      const result = await service.checkReadiness()

      expect(result.timestamp).toBeDefined()
      expect(result.uptime).toBeGreaterThanOrEqual(0)
    })
  })
})
