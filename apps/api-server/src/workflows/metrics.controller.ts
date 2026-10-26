import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { WORKFLOW_METRICS_SERVICE, type IWorkflowMetricsService } from '@vyrak/workflow-core'

import { WorkflowMetricsQueryDto } from './dto/workflow-metrics-query.dto'
import { WorkflowMetricsResponseDto } from './dto/workflow-metrics-response.dto'

/**
 * Metrics Controller
 *
 * Provides workflow execution metrics and statistics endpoints:
 * - GET /api/workflows/metrics - Get aggregated workflow metrics
 */
@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('workflows/metrics')
export class MetricsController {
  constructor(
    @Inject(WORKFLOW_METRICS_SERVICE)
    private readonly metricsService: IWorkflowMetricsService
  ) {}

  /**
   * Get workflow execution metrics
   *
   * Returns aggregated statistics including:
   * - Summary: total runs, success/failure counts, duration percentiles
   * - Time series: metrics grouped by hour/day/week
   * - Breakdown: metrics per workflow key
   *
   * @param query - Query parameters (organizationId, projectId, time range, granularity)
   * @returns Workflow metrics response
   */
  @Get()
  @ApiOperation({
    summary: 'Get workflow execution metrics and statistics',
    description:
      'Retrieve aggregated workflow metrics including summary statistics, time series data, and breakdown by workflow',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    type: WorkflowMetricsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMetrics(@Query() query: WorkflowMetricsQueryDto): Promise<WorkflowMetricsResponseDto> {
    // TODO: Verify organizationId access (reuse pattern from workflows.controller.ts)
    // For now, trust the query parameter - authorization will be added in production
    return this.metricsService.getMetrics(query)
  }
}
