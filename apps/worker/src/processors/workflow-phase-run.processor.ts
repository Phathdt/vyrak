import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject } from '@nestjs/common'
import { AI_AGENT_SERVICE, IAIAgentService } from '@vyrak/ai-agent'
import { CONVERSATION_SERVICE, IConversationService } from '@vyrak/conversation'
import { CONFIG_SERVICE } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { WorkflowPhaseRunJobSchema } from '@vyrak/workflow-core'
import { WorkflowPhaseRunHandler } from '@vyrak/workflow-execution'
import { Job } from 'bullmq'

import { withTenantContext } from '../common/decorators/with-tenant-context.decorator'

import type { OnApplicationBootstrap } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import type { WorkflowPhaseRunJob } from '@vyrak/workflow-core'

@Processor('workflow-execution')
export class WorkflowPhaseRunProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly handler: WorkflowPhaseRunHandler
  private readonly wrappedHandler: (job: WorkflowPhaseRunJob) => Promise<void>
  private readonly logger: EnhancedLogger

  constructor(
    databaseService: DatabaseService,
    @Inject(CONVERSATION_SERVICE)
    conversationService: IConversationService,
    @Inject(AI_AGENT_SERVICE)
    aiAgentService: IAIAgentService,
    @Inject(CONFIG_SERVICE)
    private readonly configService: IConfigService,
    enhancedLogger: EnhancedLogger
  ) {
    super()
    this.logger = enhancedLogger.with({ context: 'WorkflowPhaseRunProcessor' })
    this.handler = new WorkflowPhaseRunHandler(databaseService, conversationService, aiAgentService, configService)

    // Wrap handler with tenant context - same pattern as phase-transition.processor
    this.wrappedHandler = withTenantContext(databaseService, this.handler.handle.bind(this.handler))

    this.logger.log('WorkflowPhaseRunProcessor initialized')
  }

  /** Concurrency comes from config, which the static @Processor options cannot read. */
  onApplicationBootstrap(): void {
    this.worker.concurrency = this.configService.worker.executionConcurrency
    this.logger.log(`Workflow phase run concurrency: ${this.configService.worker.executionConcurrency}`)
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.id} (${job.name})`)

    if (job.name !== 'phase-run') {
      this.logger.log(`Skipping non-phase-run job: ${job.name}`)
      return
    }

    const parsed = WorkflowPhaseRunJobSchema.safeParse(job.data)
    if (!parsed.success) {
      this.logger.error(new Error(`Invalid phase-run job schema: ${parsed.error.message}`), 'Job validation failed')
      throw new Error(`Invalid phase-run job: ${parsed.error.message}`)
    }

    this.logger.log(
      `Starting phase-run: workflowId=${parsed.data.workflowId} phaseKey=${parsed.data.phaseKey} orgId=${parsed.data.metadata.orgId}`
    )

    try {
      // Execute with tenant context wrapper (extracts metadata.orgId automatically)
      await this.wrappedHandler(parsed.data)

      this.logger.log(`Completed phase-run: workflowId=${parsed.data.workflowId} phaseKey=${parsed.data.phaseKey}`)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error(
        err,
        `Failed phase-run: workflowId=${parsed.data.workflowId} phaseKey=${parsed.data.phaseKey} - ${err.message}`
      )
      throw error
    }
  }
}
