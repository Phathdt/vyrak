import { StepStatus, StepType } from '../../domain'
import { WorkflowRun } from '../../domain/entities'
import { IStepExecutor, StepExecutorResult } from './step-executor.interface'
import { StepDefinition } from './workflow-definition'

/**
 * Fake step executor for testing purposes
 * Can be configured to return specific results for each step key
 */
export class FakeStepExecutor implements IStepExecutor {
  private mockResults: Map<string, StepExecutorResult> = new Map()

  canHandle(_stepType: StepType): boolean {
    // Handle all step types for testing
    return true
  }

  async execute(step: StepDefinition, _run: WorkflowRun): Promise<StepExecutorResult> {
    // Return mock result if set, otherwise default to success
    const mockResult = this.mockResults.get(step.key)
    if (mockResult) {
      return mockResult
    }

    // Default success result
    return {
      status: StepStatus.SUCCEEDED,
      output: { result: 'success', stepKey: step.key },
      retryable: false,
    }
  }

  /**
   * Configure mock result for a specific step key
   * Useful for testing different execution scenarios
   */
  setMockResult(stepKey: string, result: StepExecutorResult): void {
    this.mockResults.set(stepKey, result)
  }

  /**
   * Clear all mock results
   */
  clearMockResults(): void {
    this.mockResults.clear()
  }

  /**
   * Clear mock result for a specific step key
   */
  clearMockResult(stepKey: string): void {
    this.mockResults.delete(stepKey)
  }
}
