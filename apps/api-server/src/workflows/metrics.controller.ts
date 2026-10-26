import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { WORKFLOW_METRICS_SERVICE, type IWorkflowMetricsService } from '@vyrak/workflow-core'

import { WorkflowMetricsQueryDto } from './dto/workflow-metrics-query.dto'
import { WorkflowMetricsResponseDto } from './dto/workflow-metrics-response.dto'

import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { OrganizationMemberGuard } from '../guards/organization-member.guard'

/**
 * Metrics Controller
 *
 * Provides workflow execution metrics and statistics endpoints:
 * - GET /api/organizations/:orgId/workflows/metrics - Get aggregated workflow metrics
 */
@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('api/organizations/:orgId/workflows/metrics')
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)
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
   * @param query - Query parameters (projectId, time range, granularity)
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
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of the organization' })
  async getMetrics(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: WorkflowMetricsQueryDto
  ): Promise<WorkflowMetricsResponseDto> {
    // OrganizationMemberGuard has already verified access and set tenant context
    // Pass organizationId from URL param to ensure consistency
    return this.metricsService.getMetrics({ ...query, organizationId: orgId })
  }
}
