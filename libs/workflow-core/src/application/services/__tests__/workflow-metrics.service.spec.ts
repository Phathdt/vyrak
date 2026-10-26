import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowState } from '../../../domain/workflow-state'
import { WorkflowMetricsService } from '../workflow-metrics.service'

describe('WorkflowMetricsService', () => {
  let service: WorkflowMetricsService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      workflowRun: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
    }
    service = new WorkflowMetricsService(mockPrisma)
  })

  describe('getMetrics', () => {
    it('should compute summary correctly with mixed states', async () => {
      // Mock groupBy for state counts
      mockPrisma.workflowRun.groupBy.mockImplementation((args: any) => {
        if (args.by.includes('state')) {
          return Promise.resolve([
            { state: WorkflowState.SUCCEEDED, _count: { _all: 100 } },
            { state: WorkflowState.FAILED, _count: { _all: 10 } },
            { state: WorkflowState.CANCELLED, _count: { _all: 5 } },
            { state: WorkflowState.RUNNING, _count: { _all: 3 } },
          ])
        }
        return Promise.resolve([])
      })

      // Mock findMany for duration calculations
      mockPrisma.workflowRun.findMany.mockImplementation((args: any) => {
        if (args.where?.state?.in) {
          // Completed runs with durations
          return Promise.resolve([
            {
              startedAt: new Date('2026-10-26T10:00:00Z'),
              completedAt: new Date('2026-10-26T10:05:00Z'), // 300s
              state: WorkflowState.SUCCEEDED,
              createdAt: new Date('2026-10-26T10:00:00Z'),
            },
            {
              startedAt: new Date('2026-10-26T11:00:00Z'),
              completedAt: new Date('2026-10-26T11:03:00Z'), // 180s
              state: WorkflowState.SUCCEEDED,
              createdAt: new Date('2026-10-26T11:00:00Z'),
            },
          ])
        }
        return Promise.resolve([])
      })

      const result = await service.getMetrics({
        organizationId: 'org-123',
        granularity: 'day',
      })

      expect(result.summary.totalRuns).toBe(118)
      expect(result.summary.succeeded).toBe(100)
      expect(result.summary.failed).toBe(10)
      expect(result.summary.cancelled).toBe(5)
      expect(result.summary.running).toBe(3)
      expect(result.summary.successRate).toBeCloseTo(0.87, 2) // 100 / (100 + 10 + 5)
      expect(result.summary.avgDurationSeconds).toBeCloseTo(240, 0) // (300 + 180) / 2
    })

    it('should handle empty results gracefully', async () => {
      mockPrisma.workflowRun.groupBy.mockResolvedValue([])
      mockPrisma.workflowRun.findMany.mockResolvedValue([])

      const result = await service.getMetrics({
        organizationId: 'org-123',
        granularity: 'day',
      })

      expect(result.summary.totalRuns).toBe(0)
      expect(result.summary.successRate).toBe(0)
      expect(result.summary.avgDurationSeconds).toBeNull()
      expect(result.summary.p50DurationSeconds).toBeNull()
      expect(result.timeSeries).toEqual([])
      expect(result.byWorkflow).toEqual([])
    })

    it('should filter by projectId when provided', async () => {
      mockPrisma.workflowRun.groupBy.mockResolvedValue([{ state: WorkflowState.SUCCEEDED, _count: { _all: 50 } }])
      mockPrisma.workflowRun.findMany.mockResolvedValue([])

      await service.getMetrics({
        organizationId: 'org-123',
        projectId: 'proj-456',
        granularity: 'day',
      })

      // Verify projectId was included in filter
      const groupByCall = mockPrisma.workflowRun.groupBy.mock.calls[0][0]
      expect(groupByCall.where.projectId).toBe('proj-456')
    })

    it('should use default time range of 7 days when not specified', async () => {
      mockPrisma.workflowRun.groupBy.mockResolvedValue([])
      mockPrisma.workflowRun.findMany.mockResolvedValue([])

      const now = new Date()
      const result = await service.getMetrics({
        organizationId: 'org-123',
        granularity: 'day',
      })

      const fromDate = new Date(result.period.from)
      const toDate = new Date(result.period.to)
      const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeCloseTo(7, 0)
    })

    it('should compute percentiles correctly', async () => {
      mockPrisma.workflowRun.groupBy.mockResolvedValue([{ state: WorkflowState.SUCCEEDED, _count: { _all: 100 } }])

      // Generate 100 runs with durations from 1s to 100s
      const runs = Array.from({ length: 100 }, (_, i) => ({
        startedAt: new Date('2026-10-26T10:00:00Z'),
        completedAt: new Date(new Date('2026-10-26T10:00:00Z').getTime() + (i + 1) * 1000),
        state: WorkflowState.SUCCEEDED,
        createdAt: new Date('2026-10-26T10:00:00Z'),
      }))

      mockPrisma.workflowRun.findMany.mockResolvedValue(runs)

      const result = await service.getMetrics({
        organizationId: 'org-123',
        granularity: 'day',
      })

      // Percentiles are approximate due to array indexing
      expect(result.summary.p50DurationSeconds).toBeCloseTo(50, -1) // Allow ±5
      expect(result.summary.p95DurationSeconds).toBeCloseTo(95, -1) // Allow ±5
      expect(result.summary.p99DurationSeconds).toBeCloseTo(99, -1) // Allow ±5
    })

    it('should compute time series with day granularity', async () => {
      mockPrisma.workflowRun.groupBy.mockResolvedValue([])
      mockPrisma.workflowRun.findMany.mockImplementation((args: any) => {
        if (!args.where?.state?.in) {
          // Time series data
          return Promise.resolve([
            {
              createdAt: new Date('2026-10-25T10:00:00Z'),
              state: WorkflowState.SUCCEEDED,
              startedAt: new Date('2026-10-25T10:00:00Z'),
              completedAt: new Date('2026-10-25T10:05:00Z'),
            },
            {
              createdAt: new Date('2026-10-25T15:00:00Z'),
              state: WorkflowState.FAILED,
              startedAt: new Date('2026-10-25T15:00:00Z'),
              completedAt: new Date('2026-10-25T15:02:00Z'),
            },
            {
              createdAt: new Date('2026-10-26T09:00:00Z'),
              state: WorkflowState.SUCCEEDED,
              startedAt: new Date('2026-10-26T09:00:00Z'),
              completedAt: new Date('2026-10-26T09:03:00Z'),
            },
          ])
        }
        return Promise.resolve([])
      })

      const result = await service.getMetrics({
        organizationId: 'org-123',
        granularity: 'day',
      })

      expect(result.timeSeries).toHaveLength(2)
      expect(result.timeSeries[0].totalRuns).toBe(2) // 2 runs on Oct 25
      expect(result.timeSeries[0].succeeded).toBe(1)
      expect(result.timeSeries[0].failed).toBe(1)
      expect(result.timeSeries[1].totalRuns).toBe(1) // 1 run on Oct 26
      expect(result.timeSeries[1].succeeded).toBe(1)
    })

    it('should compute workflow breakdown', async () => {
      mockPrisma.workflowRun.groupBy.mockImplementation((args: any) => {
        if (args.by.includes('workflowKey')) {
          return Promise.resolve([
            { workflowKey: 'workflow-a', state: WorkflowState.SUCCEEDED, _count: { _all: 80 } },
            { workflowKey: 'workflow-a', state: WorkflowState.FAILED, _count: { _all: 20 } },
            { workflowKey: 'workflow-b', state: WorkflowState.SUCCEEDED, _count: { _all: 45 } },
            { workflowKey: 'workflow-b', state: WorkflowState.FAILED, _count: { _all: 5 } },
          ])
        }
        return Promise.resolve([])
      })

      mockPrisma.workflowRun.findMany.mockImplementation((args: any) => {
        if (args.where?.workflowKey === 'workflow-a') {
          return Promise.resolve([
            {
              startedAt: new Date('2026-10-26T10:00:00Z'),
              completedAt: new Date('2026-10-26T10:04:00Z'), // 240s
            },
          ])
        }
        if (args.where?.workflowKey === 'workflow-b') {
          return Promise.resolve([
            {
              startedAt: new Date('2026-10-26T10:00:00Z'),
              completedAt: new Date('2026-10-26T10:02:00Z'), // 120s
            },
          ])
        }
        return Promise.resolve([])
      })

      const result = await service.getMetrics({
        organizationId: 'org-123',
        granularity: 'day',
      })

      expect(result.byWorkflow).toHaveLength(2)
      expect(result.byWorkflow[0].workflowKey).toBe('workflow-a')
      expect(result.byWorkflow[0].totalRuns).toBe(100)
      expect(result.byWorkflow[0].succeeded).toBe(80)
      expect(result.byWorkflow[0].failed).toBe(20)
      expect(result.byWorkflow[0].successRate).toBeCloseTo(0.8, 2)
      expect(result.byWorkflow[0].avgDurationSeconds).toBe(240)

      expect(result.byWorkflow[1].workflowKey).toBe('workflow-b')
      expect(result.byWorkflow[1].totalRuns).toBe(50)
      expect(result.byWorkflow[1].successRate).toBeCloseTo(0.9, 2)
    })
  })
})
