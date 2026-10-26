import type { Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HealthCheckService } from '../health-check.service'
import { HealthController } from '../health.controller'

describe('HealthController', () => {
  let controller: HealthController
  let mockHealthCheckService: HealthCheckService
  let mockResponse: Partial<Response>

  beforeEach(() => {
    mockHealthCheckService = {
      checkLiveness: vi.fn(),
      checkReadiness: vi.fn(),
    } as any

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    controller = new HealthController(mockHealthCheckService)
  })

  describe('checkLiveness', () => {
    it('should return 200 OK with liveness result', async () => {
      const mockResult = {
        status: 'ok' as const,
        timestamp: '2026-10-26T10:00:00.000Z',
        uptime: 3600,
      }

      vi.mocked(mockHealthCheckService.checkLiveness).mockResolvedValue(mockResult)

      await controller.checkLiveness(mockResponse as Response)

      expect(mockHealthCheckService.checkLiveness).toHaveBeenCalledOnce()
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult)
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(mockHealthCheckService.checkLiveness).mockRejectedValue(new Error('Service error'))

      await expect(controller.checkLiveness(mockResponse as Response)).rejects.toThrow('Service error')
    })
  })

  describe('checkReadiness', () => {
    it('should return 200 OK when service is ready', async () => {
      const mockResult = {
        status: 'ok' as const,
        timestamp: '2026-10-26T10:00:00.000Z',
        uptime: 3600,
        checks: {
          database: { status: 'up' as const, responseTime: 5 },
          environment: { status: 'up' as const },
        },
      }

      vi.mocked(mockHealthCheckService.checkReadiness).mockResolvedValue(mockResult)

      await controller.checkReadiness(mockResponse as Response)

      expect(mockHealthCheckService.checkReadiness).toHaveBeenCalledOnce()
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult)
    })

    it('should return 503 Service Unavailable when service is not ready', async () => {
      const mockResult = {
        status: 'error' as const,
        timestamp: '2026-10-26T10:00:00.000Z',
        uptime: 3600,
        checks: {
          database: { status: 'down' as const, error: 'Connection failed' },
          environment: { status: 'up' as const },
        },
      }

      vi.mocked(mockHealthCheckService.checkReadiness).mockResolvedValue(mockResult)

      await controller.checkReadiness(mockResponse as Response)

      expect(mockHealthCheckService.checkReadiness).toHaveBeenCalledOnce()
      expect(mockResponse.status).toHaveBeenCalledWith(503)
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult)
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(mockHealthCheckService.checkReadiness).mockRejectedValue(new Error('Service error'))

      await expect(controller.checkReadiness(mockResponse as Response)).rejects.toThrow('Service error')
    })
  })
})
