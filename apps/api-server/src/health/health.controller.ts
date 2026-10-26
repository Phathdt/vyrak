import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import type { Response } from 'express'

import type {
  HealthCheckResult,
  HealthCheckService,
} from '../../../../libs/workflow-core/src/application/services/health-check.service'
import { HEALTH_CHECK_SERVICE } from '../../../../libs/workflow-core/src/infras/di/di'

/**
 * Health Controller
 *
 * Provides health check endpoints for load balancers and orchestrators
 * - GET /health - Liveness probe
 * - GET /health/ready - Readiness probe
 */
@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    @Inject(HEALTH_CHECK_SERVICE)
    private readonly healthCheckService: HealthCheckService
  ) {}

  /**
   * Liveness probe
   * Checks if the application process is running
   * Target response time: <10ms
   */
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe - checks if app is running' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async checkLiveness(@Res() res: Response): Promise<void> {
    const result: HealthCheckResult = await this.healthCheckService.checkLiveness()
    res.status(HttpStatus.OK).json(result)
  }

  /**
   * Readiness probe
   * Checks if the application and its dependencies are healthy
   * Target response time: <50ms
   */
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe - checks if app is ready to serve traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async checkReadiness(@Res() res: Response): Promise<void> {
    const result: HealthCheckResult = await this.healthCheckService.checkReadiness()
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE
    res.status(statusCode).json(result)
  }
}
