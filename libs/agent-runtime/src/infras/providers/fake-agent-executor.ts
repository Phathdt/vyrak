import {
  AgentCancelledError,
  AgentExecutionError,
  AgentExecutionStatus,
  AgentTimeoutError,
  AgentType,
  ArtifactType,
  type AgentExecutionInput,
  type AgentExecutionResult,
  type IAgentExecutor,
} from '../../domain'

/**
 * Configuration for fake executor behavior
 */
export interface FakeExecutorConfig {
  /** Simulate execution delay in ms */
  delayMs: number

  /** Force execution to fail */
  shouldFail: boolean

  /** Error code when failing */
  errorCode?: string

  /** Error message when failing */
  errorMessage?: string

  /** Simulate timeout */
  shouldTimeout: boolean

  /** Custom output text */
  customOutput?: string

  /** Custom artifacts */
  customArtifacts?: Array<{ type: ArtifactType; path: string }>
}

/**
 * Fake agent executor for testing
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class FakeAgentExecutor implements IAgentExecutor {
  private runningExecutions = new Map<string, boolean>()
  private executionCounter = 0

  constructor(private config: FakeExecutorConfig) {}

  /**
   * Execute agent with configurable behavior
   */
  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    this.executionCounter++
    const executionId = `fake-exec-${this.executionCounter}`
    this.runningExecutions.set(executionId, true)

    try {
      // Simulate execution delay
      await this.delay(this.config.delayMs)

      // Check if cancelled during delay
      if (!this.runningExecutions.get(executionId)) {
        throw new AgentCancelledError('Execution cancelled')
      }

      // Simulate timeout
      if (this.config.shouldTimeout) {
        throw new AgentTimeoutError('Execution timeout')
      }

      // Simulate failure
      if (this.config.shouldFail) {
        throw new AgentExecutionError(
          this.config.errorMessage || 'Simulated failure',
          this.config.errorCode || 'FAKE_ERROR'
        )
      }

      // Generate success result
      return this.generateSuccessResult(input)
    } finally {
      this.runningExecutions.delete(executionId)
    }
  }

  /**
   * Cancel execution
   */
  async cancel(executionId: string): Promise<void> {
    this.runningExecutions.set(executionId, false)
  }

  /**
   * Generate mock success result
   */
  private generateSuccessResult(input: AgentExecutionInput): AgentExecutionResult {
    const output = this.config.customOutput || this.generateMockOutput(input)
    const artifacts = this.config.customArtifacts || this.generateMockArtifacts(input)

    return {
      status: AgentExecutionStatus.SUCCESS,
      output,
      artifacts,
      usage: {
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: this.config.delayMs,
      },
      exitStatus: 0,
    }
  }

  /**
   * Generate mock output based on agent type
   */
  private generateMockOutput(input: AgentExecutionInput): string {
    switch (input.agentType) {
      case AgentType.PLANNER:
        return `# Mock Plan\n\nRequirement: ${input.requirement}\n\n## Tasks\n- Task 1\n- Task 2`

      case AgentType.IMPLEMENTER:
        return `# Mock Implementation\n\nImplemented: ${input.requirement}\n\nChanges:\n- File 1\n- File 2`

      case AgentType.REVIEWER:
        return `# Mock Review\n\nReviewed implementation\n\nFindings:\n- All tests pass\n- Code quality: Good`

      default:
        return `Mock ${input.agentType} output`
    }
  }

  /**
   * Generate mock artifacts based on agent type
   */
  private generateMockArtifacts(input: AgentExecutionInput) {
    switch (input.agentType) {
      case AgentType.PLANNER:
        return [{ type: ArtifactType.PLAN, path: 'plan.md' }]

      case AgentType.IMPLEMENTER:
        return [
          { type: ArtifactType.IMPLEMENTATION, path: 'implementation.md' },
          { type: ArtifactType.TEST_RESULTS, path: 'test-results.json' },
        ]

      case AgentType.REVIEWER:
        return [
          { type: ArtifactType.REVIEW, path: 'review.md' },
          { type: ArtifactType.REPORT, path: 'report.md' },
        ]

      default:
        return []
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
