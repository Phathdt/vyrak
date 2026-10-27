import { Module } from '@nestjs/common'
import { AgentRuntimeModule } from '@vyrak/agent-runtime'
import { DatabaseModule } from '@vyrak/database'
import { WorkflowCoreModule } from '@vyrak/workflow-core'

import { WorkflowTemplatesController } from './controllers/workflow-templates.controller'
import { EventStreamService } from './services'
import { WorkflowsController } from './workflows.controller'
import { WorkflowsService } from './workflows.service'

/**
 * Workflows Module
 *
 * Provides HTTP REST API endpoints for workflow lifecycle management:
 * - List workflow templates
 * - Create workflow run from template
 * - Get workflow run details
 * - List workflow runs with filters
 * - Approve workflow
 * - Reject workflow
 * - Cancel workflow
 * - Get workflow steps
 * - Get workflow events (paginated)
 * - List workflow artifacts
 * - Get artifact content
 * - Stream workflow events (SSE)
 * - Get workflow metrics (aggregated statistics)
 * - Get workflow performance stats (step-level analysis)
 * - Get workflow stories
 * - Pause after story
 * - Skip story
 * - Retry story
 *
 * Dependencies:
 * - WorkflowCoreModule: Provides use cases and repository
 * - DatabaseModule: Provides Prisma client for authorization checks
 * - AgentRuntimeModule: Provides artifact manager
 */
@Module({
  imports: [WorkflowCoreModule, DatabaseModule, AgentRuntimeModule],
  controllers: [WorkflowsController, WorkflowTemplatesController],
  providers: [WorkflowsService, EventStreamService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
