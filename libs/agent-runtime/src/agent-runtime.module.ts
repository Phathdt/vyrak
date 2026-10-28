import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { ArtifactManager, MainRepoManager, WorkspaceManager } from './application'
import type { IArtifactRepository } from './domain'
import {
  AGENT_EXECUTOR,
  ARTIFACT_MANAGER,
  ARTIFACT_REPOSITORY,
  ArtifactPrismaRepository,
  ClaudeCodeExecutor,
  FakeAgentExecutor,
  MAIN_REPO_MANAGER,
  WORKSPACE_MANAGER,
} from './infras'

/**
 * Agent Runtime Module
 *
 * Provides agent execution, workspace management, and artifact persistence
 * for workflow orchestration and agent-based tasks
 */
@Module({
  imports: [DatabaseModule, CustomConfigModule],
  providers: [
    // Artifact repository
    {
      provide: ARTIFACT_REPOSITORY,
      useFactory: (db: DatabaseService) => new ArtifactPrismaRepository(db),
      inject: [DatabaseService],
    },

    // Artifact manager
    {
      provide: ARTIFACT_MANAGER,
      useFactory: (artifactRepo: IArtifactRepository) => new ArtifactManager(artifactRepo),
      inject: [ARTIFACT_REPOSITORY],
    },

    // Main repo manager
    {
      provide: MAIN_REPO_MANAGER,
      useFactory: (config: CustomConfigService) => {
        return new MainRepoManager(config.workspace.mainReposPath)
      },
      inject: [CustomConfigService],
    },

    // Workspace manager
    {
      provide: WORKSPACE_MANAGER,
      useFactory: (config: CustomConfigService, mainRepoManager: MainRepoManager) => {
        return new WorkspaceManager(config.workspace.workspacesPath, mainRepoManager)
      },
      inject: [CustomConfigService, MAIN_REPO_MANAGER],
    },

    // Agent executor (use fake for testing, Claude for production)
    {
      provide: AGENT_EXECUTOR,
      useFactory: (config: CustomConfigService) => {
        const useFake = config.agentRuntime.useFakeAgent

        if (useFake) {
          return new FakeAgentExecutor({
            delayMs: 1000,
            shouldFail: false,
            shouldTimeout: false,
          })
        }

        return new ClaudeCodeExecutor({
          cliPath: config.agentRuntime.claudeCliPath,
        })
      },
      inject: [CustomConfigService],
    },
  ],
  exports: [AGENT_EXECUTOR, WORKSPACE_MANAGER, ARTIFACT_MANAGER, ARTIFACT_REPOSITORY],
})
export class AgentRuntimeModule {}
