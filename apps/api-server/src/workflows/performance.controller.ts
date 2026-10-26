import { Controller, Get, Inject, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  WORKFLOW_PERFORMANCE_SERVICE,
  WorkflowPerformanceResponseDto,
  type IWorkflowPerformanceService,
} from '@vyrak/workflow-core'

import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { OrganizationMemberGuard } from '../guards/organization-member.guard'

/**
 * Performance Controller
 *
 * Provides workflow performance analysis endpoints for detailed
 * step timing, bottleneck detection, and summary statistics.
 */
@ApiTags('workflows')
@Controller('api/organizations/:orgId/workflows/runs')
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(
    @Inject(WORKFLOW_PERFORMANCE_SERVICE)
    private readonly performanceService: IWorkflowPerformanceService
  ) {}

  /**
   * GET /api/organizations/:orgId/workflows/runs/:runId/performance
   * Get detailed performance stats for a workflow run
   */
  @Get(':runId/performance')
  @ApiOperation({
    summary: 'Get detailed performance stats for a workflow run',
    description:
      'Analyzes workflow run performance with step-level timing, bottleneck detection, and summary statistics',
  })
  @ApiParam({ name: 'runId', description: 'Workflow run UUID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Performance stats retrieved successfully',
    type: WorkflowPerformanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of the organization' })
  async getPerformance(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('runId', ParseUUIDPipe) runId: string
  ): Promise<WorkflowPerformanceResponseDto> {
    try {
      const result = await this.performanceService.getPerformance(runId)
      return result as WorkflowPerformanceResponseDto
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Workflow run ${runId} not found`)
      }
      throw error
    }
  }
}
