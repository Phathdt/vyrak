import { BullModule } from '@nestjs/bullmq'
import { CONVERSATION_SERVICE, ConversationModule, IConversationService } from '@vyrak/conversation'
import { DatabaseService } from '@vyrak/database'
import {
  WORKFLOW_PHASE_RUN_PUBLISHER,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
} from '@vyrak/workflow-core'
import {
  WORKFLOW_PHASE_ORCHESTRATOR,
  WorkflowPhaseOrchestratorService,
  type IWorkflowPhaseOrchestrator,
} from '@vyrak/workflow-execution'

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
    provide: WORKFLOW_PHASE_ORCHESTRATOR,
    useFactory: (
      databaseService: DatabaseService,
      conversationService: IConversationService,
      publisher: BullWorkflowPhaseRunPublisher
    ): IWorkflowPhaseOrchestrator =>
      new WorkflowPhaseOrchestratorService(
        new WorkflowPrismaRepository(databaseService),
        new WorkflowPhasePrismaRepository(databaseService),
        conversationService,
        publisher
      ),
    inject: [DatabaseService, CONVERSATION_SERVICE, BullWorkflowPhaseRunPublisher],
  },
]
