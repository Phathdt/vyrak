import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { ArtifactManager, WorkspaceManager } from './application'
import type { IArtifactRepository } from './domain'
import {
  AGENT_EXECUTOR,
  ARTIFACT_MANAGER,
  ARTIFACT_REPOSITORY,
  ArtifactPrismaRepository,
  ClaudeCodeExecutor,
  FakeAgentExecutor,
  WORKSPACE_MANAGER,
} from './infras'

/**
 * Agent Runtime Module
 *
 * Provides agent execution, workspace management, and artifact persistence
 * for workflow orchestration and agent-based tasks
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    // Artifact repository
    {
      provide: ARTIFACT_REPOSITORY,
      useFactory: (db: DatabaseService) => new ArtifactPrismaRepository(db.client),
      inject: [DatabaseService],
    },

    // Artifact manager
    {
      provide: ARTIFACT_MANAGER,
      useFactory: (artifactRepo: IArtifactRepository) => new ArtifactManager(artifactRepo),
      inject: [ARTIFACT_REPOSITORY],
    },

    // Workspace manager
    {
      provide: WORKSPACE_MANAGER,
      useFactory: () => new WorkspaceManager(),
      inject: [],
    },

    // Agent executor (use fake for testing, Claude for production)
    {
      provide: AGENT_EXECUTOR,
      useFactory: () => {
        // Use environment variable to switch between fake and real executor
        const useFake = process.env.USE_FAKE_AGENT === 'true'

        if (useFake) {
          return new FakeAgentExecutor({
            delayMs: 1000,
            shouldFail: false,
            shouldTimeout: false,
          })
        }

        return new ClaudeCodeExecutor({
          cliPath: process.env.CLAUDE_CLI_PATH || 'claude',
        })
      },
      inject: [],
    },
  ],
  exports: [AGENT_EXECUTOR, WORKSPACE_MANAGER, ARTIFACT_MANAGER, ARTIFACT_REPOSITORY],
})
export class AgentRuntimeModule {}
