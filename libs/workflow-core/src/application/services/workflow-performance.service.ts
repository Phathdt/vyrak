import type { PrismaClient } from '@vyrak/database'

import type {
  IWorkflowPerformanceService,
  PerformanceBottleneck,
  PerformanceStep,
  PerformanceSummary,
  WorkflowPerformanceResponse,
} from './workflow-performance.service.interface'

/**
 * Workflow Performance Service
 *
 * Analyzes workflow run performance by computing step timing,
 * detecting bottlenecks, and providing summary statistics.
 *
 * Plain TypeScript class (NO @Injectable decorator) for framework independence.
 */
export class WorkflowPerformanceService implements IWorkflowPerformanceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get detailed performance analysis for a workflow run
   * @param runId - Workflow run UUID
   * @returns Performance analysis with step timing, bottlenecks, and summary
   * @throws Error if workflow run not found
   */
  async getPerformance(runId: string): Promise<WorkflowPerformanceResponse> {
    // Fetch workflow run
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
    })

    if (!run) {
      throw new Error(`Workflow run ${runId} not found`)
    }

    // Fetch all step runs for this workflow run
    const stepRuns = await this.prisma.workflowStepRun.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    })

    // Compute total duration
    const totalDurationSeconds =
      run.startedAt && run.completedAt ? (run.completedAt.getTime() - run.startedAt.getTime()) / 1000 : null

    // Build step performance data
    const steps: PerformanceStep[] = []

    // Group step runs by stepKey to handle retries
    const stepRunsByKey = new Map<string, typeof stepRuns>()
    stepRuns.forEach((stepRun) => {
      if (!stepRunsByKey.has(stepRun.stepKey)) {
        stepRunsByKey.set(stepRun.stepKey, [])
      }
      stepRunsByKey.get(stepRun.stepKey)!.push(stepRun)
    })

    // Process each step
    for (const [stepKey, stepRuns] of stepRunsByKey.entries()) {
      const latestStepRun = stepRuns[stepRuns.length - 1]
      const retries = stepRuns.length - 1

      const durationSeconds =
        latestStepRun.startedAt && latestStepRun.completedAt
          ? (latestStepRun.completedAt.getTime() - latestStepRun.startedAt.getTime()) / 1000
          : null

      const percentageOfTotal =
        totalDurationSeconds && durationSeconds ? (durationSeconds / totalDurationSeconds) * 100 : null

      const errorHistory = stepRuns
        .filter((sr) => sr.status === 'failed')
        .map((sr) => ({
          attempt: sr.attempt,
          errorMessage: sr.errorMessage || 'Unknown error',
          failedAt: sr.completedAt?.toISOString() || sr.createdAt.toISOString(),
        }))

      steps.push({
        stepKey,
        status: latestStepRun.status as 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped',
        attempt: latestStepRun.attempt,
        durationSeconds,
        percentageOfTotal,
        startedAt: latestStepRun.startedAt?.toISOString() || null,
        completedAt: latestStepRun.completedAt?.toISOString() || null,
        isCriticalPath: true, // Simplified: assume all steps are on critical path
        retries,
        ...(errorHistory.length > 0 && { errorHistory }),
      })
    }

    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(steps, totalDurationSeconds)

    // Compute summary
    const summary = this.computeSummary(steps)

    return {
      runId: run.id,
      organizationId: run.organizationId,
      projectId: run.projectId,
      workflowKey: run.workflowKey,
      state: run.status,
      totalDurationSeconds,
      steps,
      bottlenecks,
      summary,
    }
  }

  /**
   * Detect performance bottlenecks in workflow execution
   * @param steps - Step performance data
   * @param totalDuration - Total workflow duration in seconds
   * @returns List of detected bottlenecks with suggestions
   */
  private detectBottlenecks(steps: PerformanceStep[], totalDuration: number | null): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = []

    // Find longest step (if >50% of total)
    if (totalDuration) {
      const longestStep = steps
        .filter((s) => s.durationSeconds !== null)
        .sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0))[0]

      if (longestStep && longestStep.percentageOfTotal && longestStep.percentageOfTotal > 50) {
        bottlenecks.push({
          stepKey: longestStep.stepKey,
          reason: `Longest step duration (${longestStep.percentageOfTotal.toFixed(1)}% of total)`,
          durationSeconds: longestStep.durationSeconds!,
          suggestion: 'Consider breaking into smaller steps or parallelizing',
        })
      }
    }

    // Find steps with retries
    steps
      .filter((s) => s.retries > 0)
      .forEach((step) => {
        bottlenecks.push({
          stepKey: step.stepKey,
          reason: 'Multiple retries detected',
          retryCount: step.retries,
          suggestion: 'Investigate timeout configuration or agent stability',
        })
      })

    // Find slow steps (>5 minutes)
    steps
      .filter((s) => s.durationSeconds && s.durationSeconds > 300)
      .forEach((step) => {
        if (!bottlenecks.find((b) => b.stepKey === step.stepKey)) {
          bottlenecks.push({
            stepKey: step.stepKey,
            reason: 'Step duration exceeds 5 minutes',
            durationSeconds: step.durationSeconds!,
            suggestion: 'Review step implementation for performance optimization',
          })
        }
      })

    return bottlenecks
  }

  /**
   * Compute summary statistics for workflow performance
   * @param steps - Step performance data
   * @returns Summary with counts, averages, and totals
   */
  private computeSummary(steps: PerformanceStep[]): PerformanceSummary {
    const completedSteps = steps.filter((s) => s.status === 'succeeded').length
    const failedSteps = steps.filter((s) => s.status === 'failed').length

    const durations = steps.filter((s) => s.durationSeconds !== null).map((s) => s.durationSeconds!)

    const averageStepDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : null

    const longestStep = steps
      .filter((s) => s.durationSeconds !== null)
      .sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0))[0]

    const totalRetries = steps.reduce((sum, s) => sum + s.retries, 0)

    return {
      totalSteps: steps.length,
      completedSteps,
      failedSteps,
      averageStepDuration,
      longestStepKey: longestStep?.stepKey || null,
      longestStepDuration: longestStep?.durationSeconds || null,
      totalRetries,
    }
  }
}
