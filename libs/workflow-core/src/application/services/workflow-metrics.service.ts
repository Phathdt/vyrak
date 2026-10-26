import type { Prisma, PrismaClient } from '@vyrak/database'

import type {
  IWorkflowMetricsService,
  MetricsSummary,
  TimeSeriesDataPoint,
  WorkflowBreakdown,
  WorkflowMetricsQuery,
  WorkflowMetricsResponse,
} from './workflow-metrics.service.interface'

import { WorkflowState } from '../../domain/workflow-state'

/**
 * Workflow metrics service
 *
 * Computes aggregated workflow statistics from workflow_runs table:
 * - Summary: total runs, success/failure rates, duration percentiles
 * - Time series: metrics grouped by hour/day/week
 * - Breakdown: metrics per workflow key
 *
 * Plain TypeScript class - NO @Injectable() decorator
 */
export class WorkflowMetricsService implements IWorkflowMetricsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getMetrics(query: WorkflowMetricsQuery): Promise<WorkflowMetricsResponse> {
    const { organizationId, projectId, from, to, granularity } = query

    // Default time range: last 7 days
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to) : new Date()

    // Build Prisma filter
    const where = {
      organizationId,
      ...(projectId && { projectId }),
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    }

    // Compute summary
    const summary = await this.computeSummary(where)

    // Compute time series
    const timeSeries = await this.computeTimeSeries(where, granularity, fromDate, toDate)

    // Compute breakdown by workflow
    const byWorkflow = await this.computeWorkflowBreakdown(where)

    return {
      organizationId,
      projectId: projectId || null,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      summary,
      timeSeries,
      byWorkflow,
    }
  }

  private async computeSummary(where: Prisma.WorkflowRunWhereInput): Promise<MetricsSummary> {
    // Count by state
    const stateCounts = await this.prisma.workflowRun.groupBy({
      by: ['state'],
      where,
      _count: {
        _all: true,
      },
    })

    const counts = {
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      running: 0,
      queued: 0,
    }

    stateCounts.forEach((group) => {
      const count = typeof group._count === 'number' ? group._count : group._count._all
      if (group.state === WorkflowState.SUCCEEDED) counts.succeeded = count
      else if (group.state === WorkflowState.FAILED) counts.failed = count
      else if (group.state === WorkflowState.CANCELLED) counts.cancelled = count
      else if (group.state === WorkflowState.RUNNING) counts.running = count
      else if (group.state === WorkflowState.QUEUED) counts.queued = count
    })

    const totalRuns = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const completedRuns = counts.succeeded + counts.failed + counts.cancelled

    const successRate = completedRuns > 0 ? counts.succeeded / completedRuns : 0

    // Compute duration statistics (only for completed runs)
    const completedWhere = {
      ...where,
      state: { in: [WorkflowState.SUCCEEDED, WorkflowState.FAILED, WorkflowState.CANCELLED] },
      startedAt: { not: null },
      completedAt: { not: null },
    }

    const runs = await this.prisma.workflowRun.findMany({
      where: completedWhere,
      select: {
        startedAt: true,
        completedAt: true,
      },
    })

    const durations = runs
      .filter((run) => run.startedAt && run.completedAt)
      .map((run) => (run.completedAt!.getTime() - run.startedAt!.getTime()) / 1000)
      .sort((a, b) => a - b)

    const avgDurationSeconds = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : null

    const p50DurationSeconds = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : null
    const p95DurationSeconds = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : null
    const p99DurationSeconds = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : null

    return {
      totalRuns,
      succeeded: counts.succeeded,
      failed: counts.failed,
      cancelled: counts.cancelled,
      running: counts.running,
      successRate,
      avgDurationSeconds,
      p50DurationSeconds,
      p95DurationSeconds,
      p99DurationSeconds,
    }
  }

  private async computeTimeSeries(
    where: Prisma.WorkflowRunWhereInput,
    granularity: 'hour' | 'day' | 'week',
    _fromDate: Date,
    _toDate: Date
  ): Promise<TimeSeriesDataPoint[]> {
    // Fetch all runs in range
    const runs = await this.prisma.workflowRun.findMany({
      where,
      select: {
        createdAt: true,
        state: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by time bucket
    const buckets = new Map<string, TimeSeriesDataPoint>()

    runs.forEach((run) => {
      const bucketKey = this.getBucketKey(run.createdAt, granularity)

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          timestamp: bucketKey,
          totalRuns: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          avgDurationSeconds: null,
        })
      }

      const bucket = buckets.get(bucketKey)!
      bucket.totalRuns++

      if (run.state === WorkflowState.SUCCEEDED) bucket.succeeded++
      else if (run.state === WorkflowState.FAILED) bucket.failed++
      else if (run.state === WorkflowState.CANCELLED) bucket.cancelled++
    })

    // Compute avg duration per bucket
    for (const [bucketKey, bucket] of buckets.entries()) {
      const bucketRuns = runs.filter(
        (run) => this.getBucketKey(run.createdAt, granularity) === bucketKey && run.startedAt && run.completedAt
      )

      if (bucketRuns.length > 0) {
        const durations = bucketRuns.map((run) => (run.completedAt!.getTime() - run.startedAt!.getTime()) / 1000)
        bucket.avgDurationSeconds = durations.reduce((sum, d) => sum + d, 0) / durations.length
      }
    }

    return Array.from(buckets.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  private async computeWorkflowBreakdown(where: Prisma.WorkflowRunWhereInput): Promise<WorkflowBreakdown[]> {
    const grouped = await this.prisma.workflowRun.groupBy({
      by: ['workflowKey', 'state'],
      where,
      _count: {
        _all: true,
      },
    })

    const workflowMap = new Map<string, WorkflowBreakdown>()

    grouped.forEach((group) => {
      if (!workflowMap.has(group.workflowKey)) {
        workflowMap.set(group.workflowKey, {
          workflowKey: group.workflowKey,
          totalRuns: 0,
          succeeded: 0,
          failed: 0,
          successRate: 0,
          avgDurationSeconds: null,
        })
      }

      const workflow = workflowMap.get(group.workflowKey)!
      const count = typeof group._count === 'number' ? group._count : group._count._all
      workflow.totalRuns += count

      if (group.state === WorkflowState.SUCCEEDED) workflow.succeeded += count
      else if (group.state === WorkflowState.FAILED) workflow.failed += count
    })

    // Compute success rate
    for (const workflow of workflowMap.values()) {
      const completed = workflow.succeeded + workflow.failed
      workflow.successRate = completed > 0 ? workflow.succeeded / completed : 0
    }

    // Compute avg duration per workflow (separate query for performance)
    for (const workflowKey of workflowMap.keys()) {
      const runs = await this.prisma.workflowRun.findMany({
        where: {
          ...where,
          workflowKey,
          startedAt: { not: null },
          completedAt: { not: null },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
      })

      if (runs.length > 0) {
        const durations = runs.map((run) => (run.completedAt!.getTime() - run.startedAt!.getTime()) / 1000)
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
        workflowMap.get(workflowKey)!.avgDurationSeconds = avgDuration
      }
    }

    return Array.from(workflowMap.values()).sort((a, b) => b.totalRuns - a.totalRuns)
  }

  private getBucketKey(date: Date, granularity: 'hour' | 'day' | 'week'): string {
    const d = new Date(date)

    if (granularity === 'hour') {
      d.setMinutes(0, 0, 0)
      return d.toISOString()
    } else if (granularity === 'day') {
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    } else {
      // week: start of week (Sunday)
      const day = d.getDay()
      d.setDate(d.getDate() - day)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
  }
}
