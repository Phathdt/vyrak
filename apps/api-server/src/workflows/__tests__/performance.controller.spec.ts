import { NotFoundException } from '@nestjs/common'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PerformanceController } from '../performance.controller'

describe('PerformanceController', () => {
  let controller: PerformanceController
  let mockPerformanceService: any

  beforeEach(() => {
    mockPerformanceService = {
      getPerformance: vi.fn(),
    }
    controller = new PerformanceController(mockPerformanceService)
  })

  describe('getPerformance', () => {
    it('should return performance stats for valid runId', async () => {
      const mockResponse = {
        runId: 'run-123',
        organizationId: 'org-123',
        projectId: 'proj-456',
        workflowKey: 'test-workflow',
        state: 'succeeded',
        totalDurationSeconds: 300,
        steps: [
          {
            stepKey: 'step1',
            status: 'succeeded',
            attempt: 1,
            durationSeconds: 120,
            percentageOfTotal: 40,
            startedAt: '2026-10-26T10:00:00.000Z',
            completedAt: '2026-10-26T10:02:00.000Z',
            isCriticalPath: true,
            retries: 0,
          },
        ],
        bottlenecks: [],
        summary: {
          totalSteps: 1,
          completedSteps: 1,
          failedSteps: 0,
          averageStepDuration: 120,
          longestStepKey: 'step1',
          longestStepDuration: 120,
          totalRetries: 0,
        },
      }

      mockPerformanceService.getPerformance.mockResolvedValue(mockResponse)

      const result = await controller.getPerformance('run-123')

      expect(result).toEqual(mockResponse)
      expect(mockPerformanceService.getPerformance).toHaveBeenCalledWith('run-123')
    })

    it('should throw NotFoundException when workflow run not found', async () => {
      mockPerformanceService.getPerformance.mockRejectedValue(new Error('Workflow run run-123 not found'))

      await expect(controller.getPerformance('run-123')).rejects.toThrow(NotFoundException)
      await expect(controller.getPerformance('run-123')).rejects.toThrow('Workflow run run-123 not found')
    })

    it('should rethrow other errors', async () => {
      const error = new Error('Database connection error')
      mockPerformanceService.getPerformance.mockRejectedValue(error)

      await expect(controller.getPerformance('run-123')).rejects.toThrow('Database connection error')
    })
  })
})
