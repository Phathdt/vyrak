/**
 * Base error for agent execution
 */
export class AgentExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'AGENT_EXECUTION_ERROR',
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'AgentExecutionError'
  }
}

/**
 * Agent execution timeout
 */
export class AgentTimeoutError extends AgentExecutionError {
  constructor(message: string, cause?: Error) {
    super(message, 'AGENT_TIMEOUT', cause)
    this.name = 'AgentTimeoutError'
  }
}

/**
 * Agent execution cancelled
 */
export class AgentCancelledError extends AgentExecutionError {
  constructor(message: string, cause?: Error) {
    super(message, 'AGENT_CANCELLED', cause)
    this.name = 'AgentCancelledError'
  }
}

/**
 * Workspace creation failed
 */
export class WorkspaceCreationError extends AgentExecutionError {
  constructor(message: string, code?: string, cause?: Error) {
    super(message, code || 'WORKSPACE_CREATION_ERROR', cause)
    this.name = 'WorkspaceCreationError'
  }
}

/**
 * Invalid agent configuration
 */
export class InvalidAgentConfigError extends AgentExecutionError {
  constructor(message: string, cause?: Error) {
    super(message, 'INVALID_AGENT_CONFIG', cause)
    this.name = 'InvalidAgentConfigError'
  }
}
