import { Module } from '@nestjs/common'
import { WorkflowCoreModule } from '@vyrak/workflow-core'

import { HealthController } from './health.controller'

/**
 * Health Module
 *
 * Provides health check endpoints for load balancers and orchestrators
 */
@Module({
  imports: [WorkflowCoreModule],
  controllers: [HealthController],
})
export class HealthModule {}
