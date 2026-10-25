import * as fs from 'fs'
import {
  AgentCancelledError,
  AgentExecutionStatus,
  AgentTimeoutError,
  AgentType,
  ArtifactManager,
  type IAgentExecutor,
  type IWorkspaceManager,
} from '@vyrak/agent-runtime'

import type { IStepExecutor, StepExecutorResult } from './step-executor.interface'
import type { StepDefinition } from './workflow-definition'

import type { WorkflowRun } from '../../domain/entities/workflow-run.entity'
import { StepStatus, StepType } from '../../domain/step-types'

/**
 * Agent step executor service
 *
 * Integrates agent execution into workflow engine.
 * Handles workspace isolation, agent execution, and artifact persistence.
 *
 * NO @Injectable() decorator - plain TypeScript class registered via factory
 */
export class AgentStepExecutor implements IStepExecutor {
  constructor(
    private readonly agentExecutor: IAgentExecutor,
    private readonly workspaceManager: IWorkspaceManager,
    private readonly artifactManager: ArtifactManager
  ) {}

  /**
   * Check if this executor can handle the step type
   */
  canHandle(stepType: StepType): boolean {
    return stepType === StepType.AGENT
  }

  /**
   * Execute agent step with workspace isolation
   */
  async execute(step: StepDefinition, run: WorkflowRun & { input?: unknown }): Promise<StepExecutorResult> {
    let workspacePath: string | null = null

    try {
      // 1. Create isolated workspace
      workspacePath = await this.workspaceManager.createWorkspace(run.id, this.getRepoUrl(run), this.getBranch(run))

      // 2. Prepare agent input
      const agentInput = this.prepareAgentInput(step, run, workspacePath)

      // 3. Execute agent
      const agentResult = await this.agentExecutor.execute(agentInput)

      // 4. Save artifacts
      if (workspacePath) {
        await this.saveArtifacts(agentResult.artifacts, run)
      }

      // 5. Map to step result
      return this.mapToStepResult(agentResult)
    } catch (error) {
      return this.handleExecutionError(error)
    } finally {
      // 6. Cleanup workspace (optional, configurable retention)
      if (workspacePath && this.shouldCleanupWorkspace(step)) {
        await this.workspaceManager.cleanupWorkspace(run.id).catch((err: Error) => {
          console.error(`Failed to cleanup workspace for run ${run.id}:`, err)
        })
      }
    }
  }

  /**
   * Prepare agent execution input from step and run context
   */
  private prepareAgentInput(step: StepDefinition, run: WorkflowRun & { input?: unknown }, workspacePath: string) {
    const agentType = this.mapStepKeyToAgentType(step.key)
    const repoPath = this.workspaceManager.getRepoPath(run.id)

    return {
      agentType,
      requirement: this.getRequirement(run),
      planContext: this.getPlanContext(run, step.key),
      repoPath,
      workspacePath,
      timeoutMs: step.timeoutMs || 5 * 60 * 1000, // 5 minutes default
      config: step.config || {},
    }
  }

  /**
   * Map step key to agent type
   */
  private mapStepKeyToAgentType(stepKey: string): AgentType {
    const normalizedKey = stepKey.toLowerCase()

    switch (normalizedKey) {
      case 'plan':
        return AgentType.PLANNER
      case 'implement':
      case 'implementation':
        return AgentType.IMPLEMENTER
      case 'review':
        return AgentType.REVIEWER
      default:
        return AgentType.PLANNER
    }
  }

  /**
   * Get requirement from workflow run input
   */
  private getRequirement(run: WorkflowRun & { input?: unknown }): string {
    const input = run.input as Record<string, unknown> | undefined
    return (input?.requirement as string) || 'No requirement provided'
  }

  /**
   * Get plan context for implementer/reviewer steps
   * Retrieves plan artifact from previous step
   */
  private getPlanContext(_run: WorkflowRun & { input?: unknown }, currentStepKey: string): string | undefined {
    // If this is implementer or reviewer, get plan from previous step
    if (currentStepKey === 'implement' || currentStepKey === 'review') {
      // TODO: Fetch plan artifact from previous step via artifact manager
      // This will be implemented when artifact retrieval API is available
      return undefined
    }

    return undefined
  }

  /**
   * Get repository URL from run input or metadata
   */
  private getRepoUrl(run: WorkflowRun & { input?: unknown }): string {
    const input = run.input as Record<string, unknown> | undefined
    return (input?.repoUrl as string) || 'https://github.com/example/repo.git'
  }

  /**
   * Get branch name from run input
   */
  private getBranch(run: WorkflowRun & { input?: unknown }): string {
    const input = run.input as Record<string, unknown> | undefined
    return (input?.branch as string) || 'main'
  }

  /**
   * Save artifacts from agent execution to database
   */
  private async saveArtifacts(
    artifacts: Array<{ path: string; type: string; size: number }>,
    run: WorkflowRun & { input?: unknown }
  ): Promise<void> {
    const artifactsPath = this.workspaceManager.getArtifactsPath(run.id)

    for (const artifact of artifacts) {
      try {
        const artifactPath = `${artifactsPath}/${artifact.path}`

        if (!fs.existsSync(artifactPath)) {
          console.warn(`Artifact not found: ${artifactPath}`)
          continue
        }

        const content = fs.readFileSync(artifactPath, 'utf-8')

        // Save to database
        await this.artifactManager.saveArtifact({
          organizationId: run.organizationId,
          runId: run.id,
          filePath: artifact.path,
          content,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to save artifact ${artifact.path}:`, errorMessage)
        // Continue with other artifacts
      }
    }
  }

  /**
   * Map agent execution result to step executor result
   */
  private mapToStepResult(agentResult: {
    status: AgentExecutionStatus
    output: string
    artifacts: Array<{ path: string; type: string; size: number }>
    usage?: { inputTokens: number; outputTokens: number; durationMs: number }
    errorCode?: string
    errorMessage?: string
  }): StepExecutorResult {
    let status: StepStatus

    switch (agentResult.status) {
      case AgentExecutionStatus.SUCCESS:
        status = StepStatus.SUCCEEDED
        break
      case AgentExecutionStatus.FAILURE:
        status = StepStatus.FAILED
        break
      case AgentExecutionStatus.TIMEOUT:
        status = StepStatus.FAILED
        break
      case AgentExecutionStatus.CANCELLED:
        status = StepStatus.FAILED
        break
      default:
        status = StepStatus.FAILED
    }

    return {
      status,
      output: {
        agentOutput: agentResult.output,
        artifacts: agentResult.artifacts,
        usage: agentResult.usage,
      },
      errorCode: agentResult.errorCode,
      errorMessage: agentResult.errorMessage,
      retryable: this.isRetryable(agentResult.status),
    }
  }

  /**
   * Determine if error is retryable based on agent status
   */
  private isRetryable(status: AgentExecutionStatus): boolean {
    return status === AgentExecutionStatus.TIMEOUT
  }

  /**
   * Handle execution errors and convert to step result
   */
  private handleExecutionError(error: unknown): StepExecutorResult {
    if (error instanceof AgentTimeoutError) {
      return {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        errorMessage: error.message,
        retryable: true,
      }
    }

    if (error instanceof AgentCancelledError) {
      return {
        status: StepStatus.FAILED,
        errorCode: 'CANCELLED',
        errorMessage: error.message,
        retryable: false,
      }
    }

    return {
      status: StepStatus.FAILED,
      errorCode: 'EXECUTION_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      retryable: false,
    }
  }

  /**
   * Determine if workspace should be cleaned up after execution
   */
  private shouldCleanupWorkspace(step: StepDefinition): boolean {
    const config = step.config as Record<string, unknown> | undefined
    // Keep workspace for debugging if explicitly disabled
    return config?.cleanupWorkspace !== false
  }
}
