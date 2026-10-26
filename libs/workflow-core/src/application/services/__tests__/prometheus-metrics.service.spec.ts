import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrometheusMetricsService } from '../prometheus-metrics.service'

describe('PrometheusMetricsService', () => {
  let service: PrometheusMetricsService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      workflowRun: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      workflowStepRun: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $queryRaw: vi.fn(),
    }
    service = new PrometheusMetricsService(mockPrisma)
  })

  describe('getMetrics', () => {
    it('should format metrics in Prometheus text format', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          // getWorkflowRunCounts
          { state: 'succeeded', count: BigInt(100) },
          { state: 'failed', count: BigInt(10) },
        ])
        .mockResolvedValueOnce([]) // getErrorCounts (failed runs)
        .mockResolvedValueOnce([{ count: BigInt(15) }]) // getActiveRuns

      mockPrisma.workflowRun.findMany.mockResolvedValue([
        {
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:01:00Z'),
        },
      ])

      mockPrisma.workflowStepRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.count.mockResolvedValue(5)

      const output = await service.getMetrics()

      expect(output).toContain('# HELP workflow_runs_total')
      expect(output).toContain('# TYPE workflow_runs_total counter')
      expect(output).toContain('workflow_runs_total{state="succeeded"} 100')
      expect(output).toContain('workflow_runs_total{state="failed"} 10')

      expect(output).toContain('# HELP workflow_duration_seconds')
      expect(output).toContain('# TYPE workflow_duration_seconds histogram')
      expect(output).toContain('workflow_duration_seconds_bucket{le="+Inf"}')
      expect(output).toContain('workflow_duration_seconds_sum')
      expect(output).toContain('workflow_duration_seconds_count')

      expect(output).toContain('# HELP workflow_retries_total')
      expect(output).toContain('workflow_retries_total 5')

      expect(output).toContain('# HELP workflow_active_runs')
      expect(output).toContain('workflow_active_runs 15')
    })

    it('should compute histogram buckets correctly', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // getWorkflowRunCounts
        .mockResolvedValueOnce([]) // getErrorCounts
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // getActiveRuns

      mockPrisma.workflowRun.findMany.mockResolvedValue([
        {
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:00:45Z'), // 45 seconds
        },
        {
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:01:30Z'), // 90 seconds
        },
      ])
      mockPrisma.workflowStepRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.count.mockResolvedValue(0)

      const output = await service.getMetrics()

      // Buckets: 30, 60, 120, 300, 600, +Inf
      // Duration 45s should be in 60 bucket
      // Duration 90s should be in 120 bucket
      expect(output).toContain('workflow_duration_seconds_bucket{le="30"} 0')
      expect(output).toContain('workflow_duration_seconds_bucket{le="60"} 1')
      expect(output).toContain('workflow_duration_seconds_bucket{le="120"} 2')
      expect(output).toContain('workflow_duration_seconds_bucket{le="+Inf"} 2')
      expect(output).toContain('workflow_duration_seconds_count 2')
    })

    it('should handle step duration histograms by step key', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // getWorkflowRunCounts
        .mockResolvedValueOnce([]) // getErrorCounts
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // getActiveRuns

      mockPrisma.workflowRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.findMany.mockResolvedValue([
        {
          stepKey: 'planning',
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:00:25Z'), // 25 seconds
        },
        {
          stepKey: 'planning',
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:00:50Z'), // 50 seconds
        },
        {
          stepKey: 'execution',
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:00:15Z'), // 15 seconds
        },
      ])
      mockPrisma.workflowStepRun.count.mockResolvedValue(0)

      const output = await service.getMetrics()

      expect(output).toContain('# HELP workflow_step_duration_seconds')
      expect(output).toContain('# TYPE workflow_step_duration_seconds histogram')
      expect(output).toContain('workflow_step_duration_seconds_bucket{step="planning",le="30"} 1')
      expect(output).toContain('workflow_step_duration_seconds_bucket{step="planning",le="60"} 2')
      expect(output).toContain('workflow_step_duration_seconds_count{step="planning"} 2')
      expect(output).toContain('workflow_step_duration_seconds_bucket{step="execution",le="30"} 1')
      expect(output).toContain('workflow_step_duration_seconds_count{step="execution"} 1')
    })

    it('should classify error types correctly', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // getWorkflowRunCounts
        .mockResolvedValueOnce([
          // getErrorCounts (failed runs)
          { error_message: 'Timeout after 300 seconds' },
          { error_message: 'Agent failed to execute' },
          { error_message: 'Validation error: invalid input' },
          { error_message: 'Unknown error occurred' },
        ])
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // getActiveRuns

      mockPrisma.workflowRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.count.mockResolvedValue(0)

      const output = await service.getMetrics()

      expect(output).toContain('# HELP workflow_errors_total')
      expect(output).toContain('# TYPE workflow_errors_total counter')
      expect(output).toContain('workflow_errors_total{type="timeout"} 1')
      expect(output).toContain('workflow_errors_total{type="agent_failure"} 1')
      expect(output).toContain('workflow_errors_total{type="validation_error"} 1')
      expect(output).toContain('workflow_errors_total{type="other"} 1')
    })

    it('should handle empty data gracefully', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // getWorkflowRunCounts
        .mockResolvedValueOnce([]) // getErrorCounts
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // getActiveRuns

      mockPrisma.workflowRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.count.mockResolvedValue(0)

      const output = await service.getMetrics()

      // Should still produce valid Prometheus format with zero values
      expect(output).toContain('# HELP workflow_runs_total')
      expect(output).toContain('# TYPE workflow_runs_total counter')
      expect(output).toContain('# HELP workflow_duration_seconds')
      expect(output).toContain('# TYPE workflow_duration_seconds histogram')
      expect(output).toContain('workflow_duration_seconds_bucket{le="+Inf"} 0')
      expect(output).toContain('workflow_duration_seconds_sum 0')
      expect(output).toContain('workflow_duration_seconds_count 0')
      expect(output).toContain('workflow_retries_total 0')
      expect(output).toContain('workflow_active_runs 0')
    })

    it('should format metrics with correct line endings', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([]) // getWorkflowRunCounts
        .mockResolvedValueOnce([]) // getErrorCounts
        .mockResolvedValueOnce([{ count: BigInt(0) }]) // getActiveRuns

      mockPrisma.workflowRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.findMany.mockResolvedValue([])
      mockPrisma.workflowStepRun.count.mockResolvedValue(0)

      const output = await service.getMetrics()

      // Should use \n line endings
      expect(output).toContain('\n')
      expect(output).not.toContain('\r\n')

      // Should have blank lines between metric families
      expect(output).toMatch(/counter\n\n/)
    })
  })
})
