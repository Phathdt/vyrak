import { StepRun, StepStatus } from '../entities/step-run.entity'

/**
 * Repository interface for step run operations
 */
export interface IStepRepository {
  /**
   * Create a new step run
   */
  createStepRun(params: CreateStepParams): Promise<StepRun>

  /**
   * Find all steps for a workflow run
   */
  findStepsByRunId(runId: string): Promise<StepRun[]>

  /**
   * Update step status and execution result
   */
  updateStepStatus(stepRunId: string, status: StepStatus, result?: StepUpdateResult): Promise<void>

  /**
   * Increment attempt counter and reset to pending
   * Returns the new attempt number
   */
  incrementAttempt(stepRunId: string): Promise<number>

  /**
   * Find a single step run by ID
   */
  findById(stepRunId: string): Promise<StepRun | null>
}

/**
 * Parameters for creating a new step run
 */
export interface CreateStepParams {
  runId: string
  organizationId: string
  stepKey: string
  stepType: string
  input?: unknown
}

/**
 * Result data for step status update
 */
export interface StepUpdateResult {
  output?: unknown
  errorCode?: string
  errorMessage?: string
  startedAt?: Date
  completedAt?: Date
}
