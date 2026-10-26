import type { PrismaClient } from '@vyrak/database'

import type { IPrometheusMetricsService } from './prometheus-metrics.service.interface'

interface HistogramBucket {
  le: number | string
  count: number
}

/**
 * Prometheus Metrics Service
 *
 * Exports workflow metrics in Prometheus exposition format
 * Plain TypeScript class (NO @Injectable) following hexagonal architecture
 */
export class PrometheusMetricsService implements IPrometheusMetricsService {
  private readonly histogramBuckets = [30, 60, 120, 300, 600, '+Inf']
  private readonly stepHistogramBuckets = [10, 30, 60, 120, 300, '+Inf']

  constructor(private readonly prisma: PrismaClient) {}

  async getMetrics(): Promise<string> {
    const lines: string[] = []

    // Workflow runs total by state
    const stateCounts = await this.getWorkflowRunCounts()
    lines.push('# HELP workflow_runs_total Total number of workflow runs by state')
    lines.push('# TYPE workflow_runs_total counter')
    stateCounts.forEach(({ state, count }) => {
      lines.push(`workflow_runs_total{state="${state.toLowerCase()}"} ${count}`)
    })
    lines.push('')

    // Workflow duration histogram
    const durationHistogram = await this.getWorkflowDurationHistogram()
    lines.push('# HELP workflow_duration_seconds Workflow execution duration in seconds')
    lines.push('# TYPE workflow_duration_seconds histogram')
    durationHistogram.buckets.forEach((bucket) => {
      lines.push(`workflow_duration_seconds_bucket{le="${bucket.le}"} ${bucket.count}`)
    })
    lines.push(`workflow_duration_seconds_sum ${durationHistogram.sum}`)
    lines.push(`workflow_duration_seconds_count ${durationHistogram.count}`)
    lines.push('')

    // Step duration histogram by step key
    const stepHistograms = await this.getStepDurationHistograms()
    if (stepHistograms.length > 0) {
      lines.push('# HELP workflow_step_duration_seconds Step execution duration in seconds by step key')
      lines.push('# TYPE workflow_step_duration_seconds histogram')
      stepHistograms.forEach((stepHist) => {
        stepHist.buckets.forEach((bucket) => {
          lines.push(
            `workflow_step_duration_seconds_bucket{step="${stepHist.stepKey}",le="${bucket.le}"} ${bucket.count}`
          )
        })
        lines.push(`workflow_step_duration_seconds_sum{step="${stepHist.stepKey}"} ${stepHist.sum}`)
        lines.push(`workflow_step_duration_seconds_count{step="${stepHist.stepKey}"} ${stepHist.count}`)
      })
      lines.push('')
    }

    // Workflow errors total
    const errorCounts = await this.getErrorCounts()
    if (errorCounts.length > 0) {
      lines.push('# HELP workflow_errors_total Total number of workflow errors by type')
      lines.push('# TYPE workflow_errors_total counter')
      errorCounts.forEach(({ type, count }) => {
        lines.push(`workflow_errors_total{type="${type}"} ${count}`)
      })
      lines.push('')
    }

    // Workflow retries total
    const totalRetries = await this.getTotalRetries()
    lines.push('# HELP workflow_retries_total Total number of step retries')
    lines.push('# TYPE workflow_retries_total counter')
    lines.push(`workflow_retries_total ${totalRetries}`)
    lines.push('')

    // Active runs gauge
    const activeRuns = await this.getActiveRuns()
    lines.push('# HELP workflow_active_runs Current number of active workflow runs')
    lines.push('# TYPE workflow_active_runs gauge')
    lines.push(`workflow_active_runs ${activeRuns}`)
    lines.push('')

    return lines.join('\n')
  }

  private async getWorkflowRunCounts(): Promise<Array<{ state: string; count: number }>> {
    // Use raw query for groupBy with string field
    const result = await this.prisma.$queryRaw<Array<{ state: string; count: bigint }>>`
      SELECT state, COUNT(*)::bigint as count
      FROM workflow_runs
      GROUP BY state
    `

    return result.map((row) => ({
      state: row.state,
      count: Number(row.count),
    }))
  }

  private async getWorkflowDurationHistogram(): Promise<{
    buckets: HistogramBucket[]
    sum: number
    count: number
  }> {
    const runs = await this.prisma.workflowRun.findMany({
      where: {
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    })

    const durations = runs
      .filter((r) => r.startedAt && r.completedAt)
      .map((r) => (r.completedAt!.getTime() - r.startedAt!.getTime()) / 1000)
      .sort((a, b) => a - b)

    const buckets = this.computeBuckets(durations, this.histogramBuckets)
    const sum = durations.reduce((acc, d) => acc + d, 0)
    const count = durations.length

    return { buckets, sum, count }
  }

  private async getStepDurationHistograms(): Promise<
    Array<{
      stepKey: string
      buckets: HistogramBucket[]
      sum: number
      count: number
    }>
  > {
    const stepRuns = await this.prisma.workflowStepRun.findMany({
      where: {
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        stepKey: true,
        startedAt: true,
        completedAt: true,
      },
    })

    // Group by stepKey
    const byStepKey = new Map<string, number[]>()
    stepRuns.forEach((sr) => {
      if (sr.startedAt && sr.completedAt) {
        const duration = (sr.completedAt.getTime() - sr.startedAt.getTime()) / 1000
        if (!byStepKey.has(sr.stepKey)) {
          byStepKey.set(sr.stepKey, [])
        }
        byStepKey.get(sr.stepKey)!.push(duration)
      }
    })

    const result: Array<{ stepKey: string; buckets: HistogramBucket[]; sum: number; count: number }> = []

    byStepKey.forEach((durations, stepKey) => {
      durations.sort((a, b) => a - b)
      const buckets = this.computeBuckets(durations, this.stepHistogramBuckets)
      const sum = durations.reduce((acc, d) => acc + d, 0)
      const count = durations.length

      result.push({ stepKey, buckets, sum, count })
    })

    return result.sort((a, b) => a.stepKey.localeCompare(b.stepKey))
  }

  private async getErrorCounts(): Promise<Array<{ type: string; count: number }>> {
    const failedRuns = await this.prisma.$queryRaw<Array<{ error_message: string | null }>>`
      SELECT error_message
      FROM workflow_runs
      WHERE state = 'failed' AND error_message IS NOT NULL
    `

    // Simple error type classification
    const errorTypes = new Map<string, number>()

    failedRuns.forEach((run) => {
      const error = run.error_message || ''
      let type = 'unknown'

      if (error.toLowerCase().includes('timeout')) type = 'timeout'
      else if (error.toLowerCase().includes('agent')) type = 'agent_failure'
      else if (error.toLowerCase().includes('validation')) type = 'validation_error'
      else type = 'other'

      errorTypes.set(type, (errorTypes.get(type) || 0) + 1)
    })

    return Array.from(errorTypes.entries()).map(([type, count]) => ({ type, count }))
  }

  private async getTotalRetries(): Promise<number> {
    // Count step runs with attempt > 1
    const retriedSteps = await this.prisma.workflowStepRun.count({
      where: {
        attempt: { gt: 1 },
      },
    })

    return retriedSteps
  }

  private async getActiveRuns(): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM workflow_runs
      WHERE state IN ('running', 'pending')
    `

    return Number(result[0]?.count || 0)
  }

  private computeBuckets(sortedDurations: number[], bucketLimits: Array<number | string>): HistogramBucket[] {
    const buckets: HistogramBucket[] = []

    bucketLimits.forEach((le) => {
      if (le === '+Inf') {
        buckets.push({ le, count: sortedDurations.length })
      } else {
        const count = sortedDurations.filter((d) => d <= (le as number)).length
        buckets.push({ le, count })
      }
    })

    return buckets
  }
}
