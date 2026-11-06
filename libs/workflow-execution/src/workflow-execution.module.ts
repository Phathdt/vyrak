import { Module } from '@nestjs/common'
import { ARTIFACT_SERVICE, ArtifactModule, type IArtifactService } from '@vyrak/artifact'
import { ConversationModule } from '@vyrak/conversation'
import { CustomConfigModule } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'
import { RepositoryContextService, SUBTASK_REPOSITORY, WorkflowCoreModule } from '@vyrak/workflow-core'

import { WorkflowExecutionQueryService } from './application/services/workflow-execution-query.service'
import { CODE_ANALYSIS_SERVICE, SOURCE_CODE_SCOUT, WORKFLOW_EXECUTION_QUERY_SERVICE } from './infras/di/di'
import { CodeAnalysisService } from './infras/scouts/code-analysis.service'
import { RepositoryScoutService } from './infras/scouts/repository-scout.service'

import type { ISubTaskRepository } from '@vyrak/workflow-core'

// NOTE: This module DOES NOT provide WorkflowPhaseOrchestratorService
// It is provided by apps/api-server/src/workflow/workflow-phase-automation.providers.ts
//
// WorkflowPhaseRunHandler is exported as a class for manual instantiation by worker

@Module({
  imports: [WorkflowCoreModule, ConversationModule, CustomConfigModule, DatabaseModule, ArtifactModule],
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
    // Read-only execution state (sub-task status, code review and QA reports); runs no AI agent
    {
      provide: WORKFLOW_EXECUTION_QUERY_SERVICE,
      useFactory: (subTaskRepository: ISubTaskRepository, artifactService: IArtifactService, logger: EnhancedLogger) =>
        new WorkflowExecutionQueryService(subTaskRepository, artifactService, logger),
      inject: [SUBTASK_REPOSITORY, ARTIFACT_SERVICE, EnhancedLogger],
    },
  ],
  exports: [SOURCE_CODE_SCOUT, CODE_ANALYSIS_SERVICE, WORKFLOW_EXECUTION_QUERY_SERVICE],
})
export class WorkflowExecutionModule {}
