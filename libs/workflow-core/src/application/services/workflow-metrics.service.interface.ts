/**
 * Workflow metrics query parameters
 */
export interface WorkflowMetricsQuery {
  organizationId: string
  projectId?: string
  from?: string
  to?: string
  granularity: 'hour' | 'day' | 'week'
}

/**
 * Summary metrics for workflows
 */
export interface MetricsSummary {
  totalRuns: number
  succeeded: number
  failed: number
  cancelled: number
  running: number
  successRate: number
  avgDurationSeconds: number | null
  p50DurationSeconds: number | null
  p95DurationSeconds: number | null
  p99DurationSeconds: number | null
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: string
  totalRuns: number
  succeeded: number
  failed: number
  cancelled: number
  avgDurationSeconds: number | null
}

/**
 * Workflow breakdown statistics
 */
export interface WorkflowBreakdown {
  workflowKey: string
  totalRuns: number
  succeeded: number
  failed: number
  successRate: number
  avgDurationSeconds: number | null
}

/**
 * Workflow metrics response
 */
export interface WorkflowMetricsResponse {
  organizationId: string
  projectId: string | null
  period: {
    from: string
    to: string
  }
  summary: MetricsSummary
  timeSeries: TimeSeriesDataPoint[]
  byWorkflow: WorkflowBreakdown[]
}

/**
 * Workflow metrics service interface
 */
export interface IWorkflowMetricsService {
  getMetrics(query: WorkflowMetricsQuery): Promise<WorkflowMetricsResponse>
}
