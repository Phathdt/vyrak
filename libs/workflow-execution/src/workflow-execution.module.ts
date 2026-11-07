import { Module } from '@nestjs/common'
import { ARTIFACT_SERVICE, ArtifactModule, type IArtifactService } from '@vyrak/artifact'
import { ConversationModule } from '@vyrak/conversation'
import { CustomConfigModule } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'
import { GitHubAuthModule } from '@vyrak/github-auth'
import { SUBTASK_REPOSITORY, WorkflowCoreModule } from '@vyrak/workflow-core'

import { WorkflowExecutionQueryService } from './application/services/workflow-execution-query.service'
import { CODE_ANALYSIS_SERVICE, WORKFLOW_EXECUTION_QUERY_SERVICE } from './infras/di/di'
import { CodeAnalysisService } from './infras/scouts/code-analysis.service'

import type { ISubTaskRepository } from '@vyrak/workflow-core'

// NOTE: This module DOES NOT provide WorkflowPhaseOrchestratorService or SOURCE_CODE_SCOUT
// - WorkflowPhaseOrchestratorService is provided by apps/api-server/src/workflow/workflow-phase-automation.providers.ts
// - SOURCE_CODE_SCOUT requires RepositoryContextService (worker-only) and should be provided by worker app
//
// WorkflowPhaseRunHandler is exported as a class for manual instantiation by worker

@Module({
  imports: [
    WorkflowCoreModule,
    GitHubAuthModule,
    ConversationModule,
    CustomConfigModule,
    DatabaseModule,
    ArtifactModule,
  ],
  providers: [
    // Code Analysis Service
    {
      provide: CODE_ANALYSIS_SERVICE,
      useFactory: () => new CodeAnalysisService(),
      inject: [],
    },
    // Read-only execution state query service
    {
      provide: WORKFLOW_EXECUTION_QUERY_SERVICE,
      useFactory: (subTaskRepository: ISubTaskRepository, artifactService: IArtifactService, logger: EnhancedLogger) =>
        new WorkflowExecutionQueryService(subTaskRepository, artifactService, logger),
      inject: [SUBTASK_REPOSITORY, ARTIFACT_SERVICE, EnhancedLogger],
    },
  ],
  exports: [CODE_ANALYSIS_SERVICE, WORKFLOW_EXECUTION_QUERY_SERVICE],
})
export class WorkflowExecutionModule {}
