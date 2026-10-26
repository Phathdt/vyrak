import { Controller, Get, Header, Inject } from '@nestjs/common'
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PROMETHEUS_METRICS_SERVICE, type IPrometheusMetricsService } from '@vyrak/workflow-core'

/**
 * Metrics Controller
 *
 * Exposes Prometheus-compatible metrics endpoint
 */
@ApiTags('Metrics')
@Controller()
export class MetricsController {
  constructor(
    @Inject(PROMETHEUS_METRICS_SERVICE)
    private readonly prometheusMetricsService: IPrometheusMetricsService
  ) {}

  /**
   * GET /metrics - Prometheus metrics endpoint
   *
   * Returns workflow execution metrics in Prometheus exposition format.
   * This endpoint is designed to be scraped by Prometheus.
   *
   * No authentication required - metrics endpoint is public for Prometheus scraping
   */
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  @ApiExcludeEndpoint() // Exclude from Swagger UI (Prometheus endpoint)
  async getMetrics(): Promise<string> {
    return this.prometheusMetricsService.getMetrics()
  }
}
