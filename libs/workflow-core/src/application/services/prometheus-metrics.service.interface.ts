/**
 * Prometheus Metrics Service Interface
 *
 * Provides metrics in Prometheus exposition format for monitoring workflow execution
 */
export interface IPrometheusMetricsService {
  /**
   * Get all metrics in Prometheus text format
   *
   * @returns Prometheus-formatted metrics text
   */
  getMetrics(): Promise<string>
}
