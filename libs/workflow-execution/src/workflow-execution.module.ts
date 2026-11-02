import { Module } from '@nestjs/common'
import { ConversationModule } from '@vyrak/conversation'
import { CustomConfigModule } from '@vyrak/custom-config'
import { DatabaseModule } from '@vyrak/database'
import { RepositoryContextService, WorkflowCoreModule } from '@vyrak/workflow-core'

import { CODE_ANALYSIS_SERVICE, SOURCE_CODE_SCOUT } from './infras/di/di'
import { CodeAnalysisService } from './infras/scouts/code-analysis.service'
import { RepositoryScoutService } from './infras/scouts/repository-scout.service'

// NOTE: This module DOES NOT provide WorkflowPhaseOrchestratorService
// It is provided by apps/api-server/src/workflow/workflow-phase-automation.providers.ts
//
// WorkflowPhaseRunHandler is exported as a class for manual instantiation by worker

@Module({
  imports: [WorkflowCoreModule, ConversationModule, CustomConfigModule, DatabaseModule],
  providers: [
    // Code Analysis Service - plain TypeScript class
    {
      provide: CODE_ANALYSIS_SERVICE,
      useFactory: () => new CodeAnalysisService(),
      inject: [],
    },
    // Source Code Scout - plain TypeScript class
    {
      provide: SOURCE_CODE_SCOUT,
      useFactory: (repoContextService: RepositoryContextService) => {
        const resolveRepositoryPath = (workflowId: string) => repoContextService.resolveRepositoryPath(workflowId)
        return new RepositoryScoutService(resolveRepositoryPath)
      },
      inject: [RepositoryContextService],
    },
  ],
  exports: [SOURCE_CODE_SCOUT, CODE_ANALYSIS_SERVICE],
})
export class WorkflowExecutionModule {}
