import type { SubTaskEntity } from '@vyrak/workflow-core'

export interface TaskExecutionResult {
  taskId: string
  status: 'completed' | 'failed'
  artifactId?: string
  reportContent?: string
  error?: string
  startedAt: Date
  completedAt: Date
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface OrchestrationStatus {
  workflowId: string
  phaseId: string
  totalTasks: number
  completedTasks: number
  failedTasks: number
  inProgressTasks: number
  pendingTasks: number
  readyTasks: number
  tasks: SubTaskEntity[]
}

export interface IImplementationOrchestrationService {
  /**
   * Start implementation phase execution
   * Loads Implementation Plan artifact and begins orchestrating sub-tasks
   */
  startImplementation(workflowId: string, phaseId: string): Promise<void>

  /**
   * Get current orchestration status for a workflow
   */
  getStatus(workflowId: string, phaseId: string): Promise<OrchestrationStatus>

  /**
   * Retry a specific failed task
   */
  retryTask(taskId: string): Promise<TaskExecutionResult>
}
