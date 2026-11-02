export class OrchestrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrchestrationError'
  }
}

export class TaskExecutionError extends OrchestrationError {
  constructor(
    public readonly taskId: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'TaskExecutionError'
  }
}

export class ImplementationPlanNotFoundError extends OrchestrationError {
  constructor(
    public readonly workflowId: string,
    public readonly phaseId: string
  ) {
    super(`Implementation Plan artifact not found for workflow ${workflowId}, phase ${phaseId}`)
    this.name = 'ImplementationPlanNotFoundError'
  }
}

export class NoReadyTasksError extends OrchestrationError {
  constructor(public readonly workflowId: string) {
    super(`No ready tasks found for workflow ${workflowId}`)
    this.name = 'NoReadyTasksError'
  }
}

export class WorkspacePreparationError extends OrchestrationError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'WorkspacePreparationError'
  }
}
