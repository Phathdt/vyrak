import { exec } from 'child_process'
import { promisify } from 'util'

import type { IArtifactManager, IWorkspaceManager } from '@vyrak/agent-runtime'

import type { IStepExecutor, StepExecutorResult } from './step-executor.interface'
import type { StepDefinition } from './workflow-definition'

import type { WorkflowRun } from '../../domain/entities/workflow-run.entity'
import { InvalidInputException } from '../../domain/errors'
import { StepStatus, StepType } from '../../domain/step-types'

const execAsync = promisify(exec)

/**
 * Configuration for tool/command step execution
 */
export interface ToolStepConfig {
  command: string
  workdir?: string
  env?: Record<string, string>
  timeout?: number // milliseconds
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  command: string
  exitCode: number
  stdout: string
  stderr: string
  executionTimeMs: number
}

/**
 * Parsed test results from various formats
 */
export interface TestResults {
  passed: number
  failed: number
  skipped: number
  total: number
}

/**
 * Test result parser interface
 */
export interface ITestResultParser {
  parseJSON(json: string): TestResults
  parseJUnit(xml: string): TestResults
  parseTAP(tap: string): TestResults
}

/**
 * Tool step executor service
 *
 * Executes shell commands/tools in workspace context.
 * Parses test results and determines success based on exit codes.
 *
 * NO @Injectable() decorator - plain TypeScript class registered via factory
 */
export class ToolStepExecutor implements IStepExecutor {
  constructor(
    private readonly workspaceManager: IWorkspaceManager,
    private readonly artifactManager: IArtifactManager,
    private readonly testResultParser: ITestResultParser
  ) {}

  /**
   * Check if this executor can handle the step type
   */
  canHandle(stepType: StepType): boolean {
    return stepType === StepType.TOOL
  }

  /**
   * Execute tool/command step in workspace
   */
  async execute(step: StepDefinition, run: WorkflowRun): Promise<StepExecutorResult> {
    const startTime = Date.now()

    try {
      // 1. Validate step configuration
      if (!step.config || typeof step.config !== 'object') {
        throw new InvalidInputException('Missing tool configuration')
      }

      const config = step.config as unknown as ToolStepConfig
      if (!config.command) {
        throw new InvalidInputException('Missing command in tool configuration')
      }

      // 2. Get workspace path
      const repoPath = this.workspaceManager.getRepoPath(run.id)
      const workingDir = config.workdir ? `${repoPath}/${config.workdir}` : repoPath

      // 3. Execute command
      const result = await this.executeCommand(config, workingDir)

      // 4. Parse test results if available
      const testResults = await this.parseTestResults(result)

      // 5. Save execution artifact
      const artifactId = await this.saveArtifact(run, step.key, result, testResults)

      // 6. Determine success based on exit code
      const success = result.exitCode === 0

      return {
        status: success ? StepStatus.SUCCEEDED : StepStatus.FAILED,
        output: {
          command: config.command,
          exitCode: result.exitCode,
          artifactId,
          executionTimeMs: result.executionTimeMs,
          testResults: testResults
            ? {
                passed: testResults.passed,
                failed: testResults.failed,
                skipped: testResults.skipped,
                total: testResults.total,
              }
            : undefined,
        },
        errorCode: success ? undefined : 'COMMAND_FAILED',
        errorMessage: success ? undefined : result.stderr || 'Command failed with non-zero exit code',
        retryable: false,
      }
    } catch (error) {
      return {
        status: StepStatus.FAILED,
        errorCode: 'EXECUTION_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown execution error',
        output: {
          executionTimeMs: Date.now() - startTime,
        },
        retryable: false,
      }
    }
  }

  /**
   * Execute shell command in workspace
   */
  private async executeCommand(config: ToolStepConfig, cwd: string): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const timeout = config.timeout || 300000 // 5 minutes default

    try {
      const result = await execAsync(config.command, {
        cwd,
        env: { ...process.env, ...config.env },
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB output buffer
      })

      return {
        command: config.command,
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTimeMs: Date.now() - startTime,
      }
    } catch (error: unknown) {
      // Command execution failed or timed out
      const execError = error as {
        code?: number
        stdout?: string
        stderr?: string
        message?: string
        killed?: boolean
        signal?: string
      }

      return {
        command: config.command,
        exitCode: execError.code || 1,
        stdout: execError.stdout || '',
        stderr: execError.stderr || execError.message || 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Attempt to parse test results from command output
   */
  private async parseTestResults(result: ToolExecutionResult): Promise<TestResults | null> {
    try {
      // 1. Try JSON format (Jest, Vitest with --json)
      const jsonMatch = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/)
      if (jsonMatch) {
        return this.testResultParser.parseJSON(jsonMatch[0])
      }

      // 2. Try JUnit XML format
      const xmlMatch = result.stdout.match(/<testsuites[\s\S]*<\/testsuites>/)
      if (xmlMatch) {
        return this.testResultParser.parseJUnit(xmlMatch[0])
      }

      // 3. Try TAP format
      if (result.stdout.includes('1..')) {
        return this.testResultParser.parseTAP(result.stdout)
      }

      return null
    } catch (error) {
      // Parsing failed, return null (not critical)
      console.warn('Failed to parse test results:', error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  /**
   * Save command execution artifact to database
   */
  private async saveArtifact(
    run: WorkflowRun,
    stepKey: string,
    result: ToolExecutionResult,
    testResults: TestResults | null
  ): Promise<string> {
    const content = JSON.stringify(
      {
        command: result.command,
        exitCode: result.exitCode,
        stdout: result.stdout.substring(0, 50000), // Limit to 50KB
        stderr: result.stderr.substring(0, 10000), // Limit to 10KB
        executionTimeMs: result.executionTimeMs,
        testResults: testResults || undefined,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )

    const artifactId = await this.artifactManager.saveArtifact({
      organizationId: run.organizationId,
      runId: run.id,
      filePath: `${stepKey}-execution-result.json`,
      content,
    })

    return artifactId
  }
}
