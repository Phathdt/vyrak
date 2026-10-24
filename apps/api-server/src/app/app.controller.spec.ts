import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let controller: AppController
  let service: AppService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            ping: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(AppController)
    service = module.get(AppService)
  })

  describe('ping', () => {
    it('should return pong message with db health status', async () => {
      const mockResponse = {
        msg: 'pong',
        db: true,
      }

      vi.mocked(service.ping).mockResolvedValue(mockResponse)

      const result = await controller.ping()

      expect(result).toEqual(mockResponse)
      expect(service.ping).toHaveBeenCalled()
    })

    it('should return false for db status when database is unhealthy', async () => {
      const mockResponse = {
        msg: 'pong',
        db: false,
      }

      vi.mocked(service.ping).mockResolvedValue(mockResponse)

      const result = await controller.ping()

      expect(result.db).toBe(false)
      expect(result.msg).toBe('pong')
    })

    it('should handle service errors gracefully', async () => {
      vi.mocked(service.ping).mockRejectedValue(new Error('Service unavailable'))

      await expect(controller.ping()).rejects.toThrow('Service unavailable')
    })
  })
})
