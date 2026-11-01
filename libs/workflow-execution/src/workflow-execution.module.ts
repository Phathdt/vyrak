import { Module } from '@nestjs/common'
import { ConversationModule } from '@vyrak/conversation'
import { CustomConfigModule } from '@vyrak/custom-config'
import { DatabaseModule } from '@vyrak/database'
import { WorkflowCoreModule } from '@vyrak/workflow-core'

// NOTE: This module DOES NOT provide WorkflowPhaseOrchestratorService
// It is provided by apps/api-server/src/workflow/workflow-phase-automation.providers.ts
//
// WorkflowPhaseRunHandler is exported as a class for manual instantiation by worker

@Module({
  imports: [WorkflowCoreModule, ConversationModule, CustomConfigModule, DatabaseModule],
  providers: [], // NO providers - classes exported for manual instantiation
  exports: [],
})
export class WorkflowExecutionModule {}
