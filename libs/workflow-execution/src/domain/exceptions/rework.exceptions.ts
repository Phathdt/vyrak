export class ReworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReworkError'
  }
}

export class NoFindingsToFixError extends ReworkError {
  constructor(
    public readonly workflowId: string,
    public readonly phaseId: string
  ) {
    super(`No findings to fix for workflow ${workflowId}, phase ${phaseId}`)
    this.name = 'NoFindingsToFixError'
  }
}

export class MaxReworkIterationsReachedError extends ReworkError {
  constructor(
    public readonly workflowId: string,
    public readonly iterationCount: number
  ) {
    super(`Max rework iterations (${iterationCount}) reached for workflow ${workflowId}`)
    this.name = 'MaxReworkIterationsReachedError'
  }
}

export class ReworkConvergenceError extends ReworkError {
  constructor(
    public readonly workflowId: string,
    public readonly reason: string
  ) {
    super(`Rework convergence failed for workflow ${workflowId}: ${reason}`)
    this.name = 'ReworkConvergenceError'
  }
}
