import { S3Client } from '@aws-sdk/client-s3'
import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { ArtifactManager, MainRepoManager, WorkspaceManager } from './application'
import {
  AGENT_EXECUTOR,
  ARTIFACT_MANAGER,
  ARTIFACT_REPOSITORY,
  ArtifactPrismaRepository,
  ClaudeCodeExecutor,
  FakeAgentExecutor,
  MAIN_REPO_MANAGER,
  S3_STORAGE_PROVIDER,
  S3StorageProvider,
  WORKSPACE_MANAGER,
} from './infras'

import type { IArtifactRepository, IS3StorageProvider } from './domain'

/**
 * Agent Runtime Module
 *
 * Provides agent execution, workspace management, and artifact persistence
 * for workflow orchestration and agent-based tasks
 */
@Module({
  imports: [DatabaseModule, CustomConfigModule],
  providers: [
    // S3 Client provider
    {
      provide: S3Client,
      useFactory: (config: CustomConfigService) => {
        return new S3Client({
          region: config.s3.region,
          endpoint: config.s3.endpoint,
          forcePathStyle: config.s3.forcePathStyle,
          credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
          },
        })
      },
      inject: [CustomConfigService],
    },

    // S3 Storage Provider
    {
      provide: S3_STORAGE_PROVIDER,
      useFactory: (s3Client: S3Client, config: CustomConfigService) => {
        return new S3StorageProvider(s3Client, config.s3.bucket)
      },
      inject: [S3Client, CustomConfigService],
    },

    // Artifact repository (metadata only)
    {
      provide: ARTIFACT_REPOSITORY,
      useFactory: (db: DatabaseService) => {
        return new ArtifactPrismaRepository(db)
      },
      inject: [DatabaseService],
    },

    // Artifact manager (orchestrates S3 + repository)
    {
      provide: ARTIFACT_MANAGER,
      useFactory: (artifactRepo: IArtifactRepository, s3Provider: IS3StorageProvider) => {
        return new ArtifactManager(artifactRepo, s3Provider)
      },
      inject: [ARTIFACT_REPOSITORY, S3_STORAGE_PROVIDER],
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
  exports: [AGENT_EXECUTOR, WORKSPACE_MANAGER, ARTIFACT_MANAGER, ARTIFACT_REPOSITORY, S3_STORAGE_PROVIDER],
})
export class AgentRuntimeModule {}
