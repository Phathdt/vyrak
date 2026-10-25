import type { AgentConfig, AgentExecutionStatus, AgentType, ArtifactReference, UsageMetrics } from '../types'

/**
 * Input for agent execution
 */
export interface AgentExecutionInput {
  /** Type of agent to execute */
  agentType: AgentType

  /** Development requirement or task description */
  requirement: string

  /** Optional plan context for implementer/reviewer */
  planContext?: string

  /** Path to git repository */
  repoPath: string

  /** Isolated workspace directory path */
  workspacePath: string

  /** Execution timeout in milliseconds */
  timeoutMs: number

  /** Agent configuration */
  config: AgentConfig
}

/**
 * Result from agent execution
 */
export interface AgentExecutionResult {
  /** Execution status */
  status: AgentExecutionStatus

  /** Agent output text */
  output?: string

  /** Generated artifacts */
  artifacts: ArtifactReference[]

  /** Usage metrics */
  usage?: UsageMetrics

  /** Error code if failed */
  errorCode?: string

  /** Error message if failed */
  errorMessage?: string

  /** CLI exit status */
  exitStatus?: number
}

/**
 * Agent executor interface
 *
 * Providers must implement this interface to integrate with workflow engine
 */
export interface IAgentExecutor {
  /**
   * Execute an agent with given input
   */
  execute(input: AgentExecutionInput): Promise<AgentExecutionResult>

  /**
   * Cancel running agent execution
   */
  cancel(executionId: string): Promise<void>
}
