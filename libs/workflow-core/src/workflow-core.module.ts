import { Module } from '@nestjs/common'
import { AgentRuntimeModule } from '@vyrak/agent-runtime'
import type { IAgentExecutor, IArtifactManager, IWorkspaceManager } from '@vyrak/agent-runtime'
import { DatabaseModule } from '@vyrak/database'

import { AgentStepExecutor } from './application/services/agent-step-executor.service'
import { AGENT_EXECUTOR, AGENT_STEP_EXECUTOR, ARTIFACT_MANAGER, WORKSPACE_MANAGER } from './infras/di/di'

/**
 * Workflow Core Module
 *
 * Provides workflow execution engine with agent integration
 */
@Module({
  imports: [DatabaseModule, AgentRuntimeModule],
  providers: [
    // Agent step executor
    {
      provide: AGENT_STEP_EXECUTOR,
      useFactory: (
        agentExecutor: IAgentExecutor,
        workspaceManager: IWorkspaceManager,
        artifactManager: IArtifactManager
      ) => new AgentStepExecutor(agentExecutor, workspaceManager, artifactManager),
      inject: [AGENT_EXECUTOR, WORKSPACE_MANAGER, ARTIFACT_MANAGER],
    },
  ],
  exports: [AGENT_STEP_EXECUTOR],
})
export class WorkflowCoreModule {}
