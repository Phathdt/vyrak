import { Module } from '@nestjs/common'
import { WorkflowCoreModule } from '@vyrak/workflow-core'

import { MetricsController } from './metrics.controller'

/**
 * Metrics Module
 *
 * Provides Prometheus-compatible metrics endpoint
 */
@Module({
  imports: [WorkflowCoreModule],
  controllers: [MetricsController],
})
export class MetricsModule {}
