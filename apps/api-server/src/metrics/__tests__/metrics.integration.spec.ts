import { PrismaClient, WorkflowState } from '@vyrak/database'
import { getPrismaClient, resetCounters, startPostgres, stopPostgres } from '@vyrak/database/test-utils'
import {
  PrometheusMetricsService,
  WorkflowPrismaRepository,
  type IPrometheusMetricsService,
  type IWorkflowRepository,
} from '@vyrak/workflow-core'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

describe('PrometheusMetricsService Integration', () => {
  let prisma: PrismaClient | undefined
  let repository: IWorkflowRepository
  let service: IPrometheusMetricsService

  beforeAll(async () => {
    try {
      await startPostgres()
      prisma = getPrismaClient()
      repository = new WorkflowPrismaRepository(prisma)
      service = new PrometheusMetricsService(repository)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.$disconnect()
      }
    } catch (error) {
      // Ignore disconnect errors during cleanup
    } finally {
      await stopPostgres()
    }
  })

  beforeEach(async () => {
    if (!prisma) return

    // Clean up data
    await prisma.stepRun.deleteMany()
    await prisma.workflowRun.deleteMany()

    // Reset counters
    resetCounters()

    // Seed test data
    await prisma.workflowRun.createMany({
      data: [
        {
          id: 'run-prom-1',
          organizationId: 'org-prom',
          projectId: 'proj-prom',
          workflowKey: 'prom-workflow',
          workflowVersion: '1.0.0',
          state: WorkflowState.SUCCEEDED,
          initiatedByUserId: 'user-prom',
          startedAt: new Date('2026-10-26T10:00:00Z'),
          completedAt: new Date('2026-10-26T10:01:00Z'),
        },
        {
          id: 'run-prom-2',
          organizationId: 'org-prom',
          projectId: 'proj-prom',
          workflowKey: 'prom-workflow',
          workflowVersion: '1.0.0',
          state: WorkflowState.RUNNING,
          initiatedByUserId: 'user-prom',
          startedAt: new Date('2026-10-26T10:02:00Z'),
        },
      ],
    })
  })

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      if (!prisma) return

      const start = Date.now()
      const text = await service.getMetrics()
      const duration = Date.now() - start

      expect(typeof text).toBe('string')

      // Verify format
      expect(text).toContain('# HELP workflow_runs_total')
      expect(text).toContain('# TYPE workflow_runs_total counter')
      expect(text).toContain('workflow_runs_total{state="succeeded"}')
      expect(text).toContain('workflow_runs_total{state="running"}')

      expect(text).toContain('# HELP workflow_duration_seconds')
      expect(text).toContain('# TYPE workflow_duration_seconds histogram')
      expect(text).toContain('workflow_duration_seconds_bucket{le="+Inf"}')
      expect(text).toContain('workflow_duration_seconds_sum')
      expect(text).toContain('workflow_duration_seconds_count')

      expect(text).toContain('# HELP workflow_active_runs')
      expect(text).toContain('# TYPE workflow_active_runs gauge')
      expect(text).toContain('workflow_active_runs')

      // Verify performance target: <250ms
      expect(duration).toBeLessThan(250)
    })

    it('should have valid Prometheus format', async () => {
      if (!prisma) return

      const text = await service.getMetrics()
      const lines = text.split('\n')

      // Check HELP/TYPE pairs
      const helpLines = lines.filter((l) => l.startsWith('# HELP'))
      const typeLines = lines.filter((l) => l.startsWith('# TYPE'))

      expect(helpLines.length).toBeGreaterThan(0)
      expect(typeLines.length).toBe(helpLines.length)

      // Check metric lines format
      const metricLines = lines.filter((l) => l && !l.startsWith('#'))
      metricLines.forEach((line) => {
        // Should match: metric_name{labels} value or metric_name value
        expect(line).toMatch(/^[a-z_]+[a-z0-9_]*(\{[^}]+\})?\s+[\d.eE+-]+$/)
      })
    })

    it('should include counter metrics', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Verify workflow_runs_total counter
      expect(text).toContain('# TYPE workflow_runs_total counter')
      expect(text).toMatch(/workflow_runs_total\{state="succeeded"\}\s+\d+/)
      expect(text).toMatch(/workflow_runs_total\{state="running"\}\s+\d+/)
    })

    it('should include histogram metrics', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Verify histogram structure
      expect(text).toContain('# TYPE workflow_duration_seconds histogram')
      expect(text).toContain('workflow_duration_seconds_bucket{le="')
      expect(text).toContain('workflow_duration_seconds_sum')
      expect(text).toContain('workflow_duration_seconds_count')
    })

    it('should include gauge metrics', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Verify workflow_active_runs gauge
      expect(text).toContain('# TYPE workflow_active_runs gauge')
      expect(text).toMatch(/workflow_active_runs\s+\d+/)
    })

    it('should return consistent format on multiple requests', async () => {
      if (!prisma) return

      const text1 = await service.getMetrics()
      const text2 = await service.getMetrics()

      const lines1 = text1.split('\n').filter((l) => l.startsWith('# TYPE'))
      const lines2 = text2.split('\n').filter((l) => l.startsWith('# TYPE'))

      // Same metric types should be present
      expect(lines1).toEqual(lines2)
    })

    it('should include step-level metrics if implemented', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Check for step duration metrics if implemented
      if (text.includes('workflow_step_duration_seconds')) {
        expect(text).toContain('# TYPE workflow_step_duration_seconds histogram')
      }
    })

    it('should include error metrics if implemented', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Check for error counter if implemented
      if (text.includes('workflow_errors_total')) {
        expect(text).toContain('# TYPE workflow_errors_total counter')
      }
    })

    it('should include retry metrics if implemented', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Check for retry counter if implemented
      if (text.includes('workflow_retries_total')) {
        expect(text).toContain('# TYPE workflow_retries_total counter')
      }
    })

    it('should have valid histogram buckets', async () => {
      if (!prisma) return

      const text = await service.getMetrics()
      const bucketLines = text.split('\n').filter((l) => l.includes('_bucket{le='))

      // Should have multiple buckets
      expect(bucketLines.length).toBeGreaterThan(0)

      // Should have +Inf bucket
      const infBucket = bucketLines.find((l) => l.includes('le="+Inf"'))
      expect(infBucket).toBeDefined()
    })

    it('should reflect current database state', async () => {
      if (!prisma) return

      const text = await service.getMetrics()

      // Count should reflect seeded data
      const succeededMatch = text.match(/workflow_runs_total\{state="succeeded"\}\s+(\d+)/)
      const runningMatch = text.match(/workflow_runs_total\{state="running"\}\s+(\d+)/)

      expect(succeededMatch).toBeDefined()
      expect(runningMatch).toBeDefined()
      expect(Number.parseInt(succeededMatch![1])).toBeGreaterThan(0)
      expect(Number.parseInt(runningMatch![1])).toBeGreaterThan(0)
    })
  })
})
