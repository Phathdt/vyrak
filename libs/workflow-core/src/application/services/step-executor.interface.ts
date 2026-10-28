import { StepStatus, StepType } from '../../domain'
import { WorkflowRun } from '../../domain/entities'
import { StepDefinition } from './workflow-definition'

/**
 * Result of step execution (application layer)
 * Simplified version of domain StepExecutionResult for service orchestration
 */
export interface StepExecutorResult {
  status: StepStatus
  output?: unknown
  errorCode?: string
  errorMessage?: string
  retryable?: boolean
}

/**
 * Interface for step executors
 * Each step type (AGENT, TOOL, APPROVAL) will have its own executor implementation
 */
export interface IStepExecutor {
  /**
   * Check if this executor can handle the given step type
   */
  canHandle(stepType: StepType): boolean

  /**
   * Execute a workflow step
   * @param step - Step definition with configuration
   * @param run - Workflow run context
   * @returns Execution result with status and output
   */
  execute(step: StepDefinition, run: WorkflowRun): Promise<StepExecutorResult>
}
