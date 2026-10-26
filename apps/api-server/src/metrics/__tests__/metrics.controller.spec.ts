import { PROMETHEUS_METRICS_SERVICE, type IPrometheusMetricsService } from '@vyrak/workflow-core'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MetricsController } from '../metrics.controller'

describe('MetricsController', () => {
  let controller: MetricsController
  let mockPrometheusMetricsService: IPrometheusMetricsService

  beforeEach(() => {
    mockPrometheusMetricsService = {
      getMetrics: vi.fn(),
    }
    controller = new MetricsController(mockPrometheusMetricsService)
  })

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const mockMetrics = `# HELP workflow_runs_total Total number of workflow runs by state
# TYPE workflow_runs_total counter
workflow_runs_total{state="succeeded"} 100
workflow_runs_total{state="failed"} 10

# HELP workflow_active_runs Current number of active workflow runs
# TYPE workflow_active_runs gauge
workflow_active_runs 5
`

      vi.mocked(mockPrometheusMetricsService.getMetrics).mockResolvedValue(mockMetrics)

      const result = await controller.getMetrics()

      expect(result).toBe(mockMetrics)
      expect(mockPrometheusMetricsService.getMetrics).toHaveBeenCalledOnce()
    })

    it('should handle empty metrics', async () => {
      vi.mocked(mockPrometheusMetricsService.getMetrics).mockResolvedValue('')

      const result = await controller.getMetrics()

      expect(result).toBe('')
    })

    it('should propagate service errors', async () => {
      const error = new Error('Database connection failed')
      vi.mocked(mockPrometheusMetricsService.getMetrics).mockRejectedValue(error)

      await expect(controller.getMetrics()).rejects.toThrow('Database connection failed')
    })
  })

  describe('DI token', () => {
    it('should use correct token for injection', () => {
      expect(PROMETHEUS_METRICS_SERVICE).toBeDefined()
      expect(typeof PROMETHEUS_METRICS_SERVICE).toBe('symbol')
    })
  })
})
