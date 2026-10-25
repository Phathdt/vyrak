import { spawn, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import {
  AgentCancelledError,
  AgentExecutionError,
  AgentExecutionStatus,
  AgentTimeoutError,
  AgentType,
  ArtifactType,
  type AgentExecutionInput,
  type AgentExecutionResult,
  type ArtifactReference,
  type IAgentExecutor,
} from '../../domain'

/**
 * Configuration for Claude Code executor
 */
export interface ClaudeCodeConfig {
  /** Path to claude CLI (default: 'claude') */
  cliPath?: string

  /** Additional CLI arguments */
  additionalArgs?: string[]

  /** Environment variables */
  env?: Record<string, string>
}

/**
 * Claude Code executor implementation
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class ClaudeCodeExecutor implements IAgentExecutor {
  private runningProcesses = new Map<string, ChildProcess>()

  constructor(private config: ClaudeCodeConfig = {}) {}

  /**
   * Execute Claude Code agent
   */
  async execute(input: AgentExecutionInput): Promise<AgentExecutionResult> {
    const executionId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
      // Prepare input files
      const inputFilePath = await this.writeInputFile(input)

      // Build command
      const command = this.buildCommand(input, inputFilePath)

      // Execute with timeout
      const result = await this.executeWithTimeout(executionId, command, input.workspacePath, input.timeoutMs)

      // Parse artifacts
      const artifacts = this.parseArtifacts(input.workspacePath)

      return {
        status: result.exitCode === 0 ? AgentExecutionStatus.SUCCESS : AgentExecutionStatus.FAILURE,
        output: result.stdout,
        artifacts,
        usage: this.extractUsageMetrics(result.stdout),
        errorCode: result.exitCode === 0 ? undefined : 'AGENT_EXECUTION_FAILED',
        errorMessage: result.exitCode === 0 ? undefined : result.stderr,
        exitStatus: result.exitCode,
      }
    } catch (error) {
      if (error instanceof AgentTimeoutError || error instanceof AgentCancelledError) {
        throw error
      }

      throw new AgentExecutionError(
        `Claude Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLAUDE_EXECUTION_ERROR',
        error instanceof Error ? error : undefined
      )
    } finally {
      this.runningProcesses.delete(executionId)
    }
  }

  /**
   * Cancel running execution
   */
  async cancel(executionId: string): Promise<void> {
    const process = this.runningProcesses.get(executionId)

    if (process && !process.killed) {
      process.kill('SIGTERM')

      // Force kill after 5 seconds
      setTimeout(() => {
        if (process && !process.killed) {
          process.kill('SIGKILL')
        }
      }, 5000)
    }
  }

  /**
   * Write input file for Claude Code
   */
  private async writeInputFile(input: AgentExecutionInput): Promise<string> {
    const inputDir = path.join(input.workspacePath, '.claude-input')

    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true })
    }

    const inputFilePath = path.join(inputDir, 'requirement.txt')

    let content = input.requirement

    // Add plan context for implementer/reviewer
    if (input.planContext && input.agentType !== AgentType.PLANNER) {
      content = `# Plan Context\n\n${input.planContext}\n\n---\n\n# Requirement\n\n${content}`
    }

    fs.writeFileSync(inputFilePath, content, 'utf-8')

    return inputFilePath
  }

  /**
   * Build Claude CLI command
   */
  private buildCommand(input: AgentExecutionInput, inputFilePath: string): string[] {
    const cliPath = this.config.cliPath || 'claude'

    const command = [cliPath, 'code']

    // Add agent type specific flags
    switch (input.agentType) {
      case AgentType.PLANNER:
        command.push('--task', 'plan')
        break
      case AgentType.IMPLEMENTER:
        command.push('--task', 'implement')
        break
      case AgentType.REVIEWER:
        command.push('--task', 'review')
        break
    }

    // Add input file
    command.push('--input', inputFilePath)

    // Add workspace path
    command.push('--workspace', input.workspacePath)

    // Add repo path
    command.push('--repo', input.repoPath)

    // Add additional config
    if (input.config.model) {
      command.push('--model', input.config.model)
    }

    // Add custom args
    if (this.config.additionalArgs) {
      command.push(...this.config.additionalArgs)
    }

    return command
  }

  /**
   * Execute command with timeout
   */
  private async executeWithTimeout(
    executionId: string,
    command: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      let timedOut = false

      const childProcess = spawn(command[0], command.slice(1), {
        cwd,
        env: {
          ...process.env,
          ...this.config.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      this.runningProcesses.set(executionId, childProcess)

      // Setup timeout
      const timeout = setTimeout(() => {
        timedOut = true
        childProcess.kill('SIGTERM')

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!childProcess.killed) {
            childProcess.kill('SIGKILL')
          }
        }, 5000)
      }, timeoutMs)

      // Capture stdout
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      // Capture stderr
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process exit
      childProcess.on('close', (code) => {
        clearTimeout(timeout)

        if (timedOut) {
          reject(new AgentTimeoutError(`Execution timed out after ${timeoutMs}ms`))
        } else if (code === null) {
          reject(new AgentCancelledError('Process was killed'))
        } else {
          resolve({
            stdout,
            stderr,
            exitCode: code,
          })
        }
      })

      // Handle process errors
      childProcess.on('error', (error) => {
        clearTimeout(timeout)
        reject(new AgentExecutionError(`Process spawn failed: ${error.message}`, 'PROCESS_SPAWN_ERROR', error))
      })
    })
  }

  /**
   * Parse artifacts from workspace
   */
  private parseArtifacts(workspacePath: string): ArtifactReference[] {
    const artifacts: ArtifactReference[] = []
    const artifactsDir = path.join(workspacePath, 'artifacts')

    if (!fs.existsSync(artifactsDir)) {
      return artifacts
    }

    const files = fs.readdirSync(artifactsDir)

    for (const file of files) {
      const filePath = path.join(artifactsDir, file)
      const stats = fs.statSync(filePath)

      if (stats.isFile()) {
        const type = this.inferArtifactType(file)

        artifacts.push({
          type,
          path: file,
          size: stats.size,
        })
      }
    }

    return artifacts
  }

  /**
   * Infer artifact type from filename
   */
  private inferArtifactType(filename: string): ArtifactType {
    const lower = filename.toLowerCase()

    if (lower.includes('plan')) return ArtifactType.PLAN
    if (lower.includes('implementation') || lower.includes('impl')) {
      return ArtifactType.IMPLEMENTATION
    }
    if (lower.includes('test')) return ArtifactType.TEST_RESULTS
    if (lower.includes('review')) return ArtifactType.REVIEW
    if (lower.includes('report')) return ArtifactType.REPORT

    return ArtifactType.REPORT // Default
  }

  /**
   * Extract usage metrics from stdout
   */
  private extractUsageMetrics(stdout: string):
    | {
        inputTokens: number
        outputTokens: number
        durationMs: number
      }
    | undefined {
    // Try to parse usage from Claude CLI output
    // Format: "Usage: input=1000 output=500 duration=5000ms"

    const usageMatch = stdout.match(/Usage:\s+input=(\d+)\s+output=(\d+)\s+duration=(\d+)ms/)

    if (usageMatch) {
      return {
        inputTokens: parseInt(usageMatch[1], 10),
        outputTokens: parseInt(usageMatch[2], 10),
        durationMs: parseInt(usageMatch[3], 10),
      }
    }

    return undefined
  }
}
