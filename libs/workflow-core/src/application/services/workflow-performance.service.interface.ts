/**
 * Performance data for a single step in a workflow run
 */
export interface PerformanceStep {
  stepKey: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  attempt: number
  durationSeconds: number | null
  percentageOfTotal: number | null
  startedAt: string | null
  completedAt: string | null
  isCriticalPath: boolean
  retries: number
  errorHistory?: Array<{
    attempt: number
    errorMessage: string
    failedAt: string
  }>
}

/**
 * Performance bottleneck detected in workflow execution
 */
export interface PerformanceBottleneck {
  stepKey: string
  reason: string
  durationSeconds?: number
  retryCount?: number
  suggestion: string
}

/**
 * Summary statistics for workflow performance
 */
export interface PerformanceSummary {
  totalSteps: number
  completedSteps: number
  failedSteps: number
  averageStepDuration: number | null
  longestStepKey: string | null
  longestStepDuration: number | null
  totalRetries: number
}

/**
 * Complete performance analysis response for a workflow run
 */
export interface WorkflowPerformanceResponse {
  runId: string
  organizationId: string
  projectId: string
  workflowKey: string
  state: string
  totalDurationSeconds: number | null
  steps: PerformanceStep[]
  bottlenecks: PerformanceBottleneck[]
  summary: PerformanceSummary
}

/**
 * Service interface for workflow performance analysis
 */
export interface IWorkflowPerformanceService {
  /**
   * Get detailed performance analysis for a workflow run
   * @param runId - Workflow run UUID
   * @returns Performance analysis with step timing, bottlenecks, and summary
   */
  getPerformance(runId: string): Promise<WorkflowPerformanceResponse>
}
