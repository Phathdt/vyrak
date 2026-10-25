import { Module } from '@nestjs/common'

import { DatabaseModule } from '@vyrak/database'
import { WorkflowCoreModule } from '@vyrak/workflow-core'

import { WorkflowsController } from './workflows.controller'
import { WorkflowsService } from './workflows.service'

/**
 * Workflows Module
 *
 * Provides HTTP REST API endpoints for workflow lifecycle management:
 * - Create workflow run
 * - Get workflow run details
 * - List workflow runs with filters
 * - Approve workflow
 * - Reject workflow
 * - Cancel workflow
 *
 * Dependencies:
 * - WorkflowCoreModule: Provides use cases and repository
 * - DatabaseModule: Provides Prisma client for authorization checks
 */
@Module({
  imports: [WorkflowCoreModule, DatabaseModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
