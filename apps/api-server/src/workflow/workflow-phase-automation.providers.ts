import { BullModule } from '@nestjs/bullmq'
import { ConversationModule, ConversationService } from '@vyrak/conversation'
import { DatabaseService } from '@vyrak/database'
import {
  WORKFLOW_PHASE_RUN_PUBLISHER,
  WorkflowPhaseOrchestratorService,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
} from '@vyrak/workflow'

import { BullWorkflowPhaseRunPublisher, WORKFLOW_PHASE_RUN_QUEUE } from './workflow-phase-run.publisher'

export const workflowPhaseAutomationImports = [
  ConversationModule,
  BullModule.registerQueue({
    name: WORKFLOW_PHASE_RUN_QUEUE,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: true,
      removeOnFail: false,
    },
  }),
]

export const workflowPhaseAutomationProviders = [
  BullWorkflowPhaseRunPublisher,
  {
    provide: WORKFLOW_PHASE_RUN_PUBLISHER,
    useExisting: BullWorkflowPhaseRunPublisher,
  },
  {
    provide: WorkflowPhaseOrchestratorService,
    useFactory: (
      databaseService: DatabaseService,
      conversationService: ConversationService,
      publisher: BullWorkflowPhaseRunPublisher
    ) =>
      new WorkflowPhaseOrchestratorService(
        new WorkflowPrismaRepository(databaseService),
        new WorkflowPhasePrismaRepository(databaseService),
        conversationService,
        publisher
      ),
    inject: [DatabaseService, ConversationService, BullWorkflowPhaseRunPublisher],
  },
]
