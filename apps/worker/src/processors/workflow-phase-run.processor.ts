import { Processor, WorkerHost } from '@nestjs/bullmq'
import { ConversationService } from '@vyrak/conversation'
import { CustomConfigService } from '@vyrak/custom-config'
import { DatabaseService } from '@vyrak/database'
import { WorkflowPhaseRunHandler, WorkflowPhaseRunJobSchema } from '@vyrak/workflow'
import { Job } from 'bullmq'

@Processor('workflow-execution')
export class WorkflowPhaseRunProcessor extends WorkerHost {
  private readonly handler: WorkflowPhaseRunHandler

  constructor(
    databaseService: DatabaseService,
    conversationService: ConversationService,
    configService: CustomConfigService
  ) {
    super()
    this.handler = new WorkflowPhaseRunHandler(databaseService, conversationService, configService)
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'phase-run') {
      return
    }

    const parsed = WorkflowPhaseRunJobSchema.safeParse(job.data)
    if (!parsed.success) {
      throw new Error(`Invalid phase-run job: ${parsed.error.message}`)
    }

    await this.handler.handle(parsed.data)
  }
}
