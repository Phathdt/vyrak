import * as fs from 'fs'
import * as path from 'path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClaudeCodeExecutor } from './claude-code-executor'

import { AgentType, ArtifactType, type AgentExecutionInput } from '../../domain'

describe('ClaudeCodeExecutor', () => {
  let executor: ClaudeCodeExecutor
  const testWorkspace = '/tmp/test-workspace'

  beforeEach(() => {
    executor = new ClaudeCodeExecutor({
      cliPath: 'echo', // Use echo for testing
    })
  })

  describe('buildCommand', () => {
    it('should build correct command for planner', () => {
      const input: AgentExecutionInput = {
        agentType: AgentType.PLANNER,
        requirement: 'Test requirement',
        repoPath: '/repo',
        workspacePath: testWorkspace,
        timeoutMs: 30000,
        config: {},
      }

      // Access private method for testing
      const command = (executor as any).buildCommand(input, '/tmp/input.txt')

      expect(command).toContain('--task')
      expect(command).toContain('plan')
      expect(command).toContain('--workspace')
      expect(command).toContain(testWorkspace)
    })

    it('should build correct command for implementer', () => {
      const input: AgentExecutionInput = {
        agentType: AgentType.IMPLEMENTER,
        requirement: 'Test implementation',
        repoPath: '/repo',
        workspacePath: testWorkspace,
        timeoutMs: 30000,
        config: {},
      }

      const command = (executor as any).buildCommand(input, '/tmp/input.txt')

      expect(command).toContain('--task')
      expect(command).toContain('implement')
    })

    it('should build correct command for reviewer', () => {
      const input: AgentExecutionInput = {
        agentType: AgentType.REVIEWER,
        requirement: 'Test review',
        repoPath: '/repo',
        workspacePath: testWorkspace,
        timeoutMs: 30000,
        config: {},
      }

      const command = (executor as any).buildCommand(input, '/tmp/input.txt')

      expect(command).toContain('--task')
      expect(command).toContain('review')
    })

    it('should include model in command', () => {
      const input: AgentExecutionInput = {
        agentType: AgentType.PLANNER,
        requirement: 'Test requirement',
        repoPath: '/repo',
        workspacePath: testWorkspace,
        timeoutMs: 30000,
        config: {
          model: 'claude-sonnet-4-20250514',
        },
      }

      const command = (executor as any).buildCommand(input, '/tmp/input.txt')

      expect(command).toContain('--model')
      expect(command).toContain('claude-sonnet-4-20250514')
    })

    it('should include additional args', () => {
      executor = new ClaudeCodeExecutor({
        cliPath: 'claude',
        additionalArgs: ['--verbose', '--debug'],
      })

      const input: AgentExecutionInput = {
        agentType: AgentType.PLANNER,
        requirement: 'Test requirement',
        repoPath: '/repo',
        workspacePath: testWorkspace,
        timeoutMs: 30000,
        config: {},
      }

      const command = (executor as any).buildCommand(input, '/tmp/input.txt')

      expect(command).toContain('--verbose')
      expect(command).toContain('--debug')
    })
  })

  describe('inferArtifactType', () => {
    it('should infer plan type', () => {
      const type = (executor as any).inferArtifactType('plan.md')
      expect(type).toBe(ArtifactType.PLAN)
    })

    it('should infer implementation type from implementation keyword', () => {
      const type = (executor as any).inferArtifactType('implementation.md')
      expect(type).toBe(ArtifactType.IMPLEMENTATION)
    })

    it('should infer implementation type from impl keyword', () => {
      const type = (executor as any).inferArtifactType('impl-report.md')
      expect(type).toBe(ArtifactType.IMPLEMENTATION)
    })

    it('should infer test results type', () => {
      const type = (executor as any).inferArtifactType('test-results.md')
      expect(type).toBe(ArtifactType.TEST_RESULTS)
    })

    it('should infer review type', () => {
      const type = (executor as any).inferArtifactType('code-review.md')
      expect(type).toBe(ArtifactType.REVIEW)
    })

    it('should infer report type', () => {
      const type = (executor as any).inferArtifactType('execution-report.md')
      expect(type).toBe(ArtifactType.REPORT)
    })

    it('should default to report for unknown files', () => {
      const type = (executor as any).inferArtifactType('unknown.txt')
      expect(type).toBe(ArtifactType.REPORT)
    })
  })

  describe('extractUsageMetrics', () => {
    it('should extract usage from stdout', () => {
      const stdout = 'Some output\nUsage: input=1000 output=500 duration=5000ms\nMore output'

      const usage = (executor as any).extractUsageMetrics(stdout)

      expect(usage).toBeDefined()
      expect(usage?.inputTokens).toBe(1000)
      expect(usage?.outputTokens).toBe(500)
      expect(usage?.durationMs).toBe(5000)
    })

    it('should extract usage with different values', () => {
      const stdout = 'Usage: input=2500 output=1200 duration=15000ms'

      const usage = (executor as any).extractUsageMetrics(stdout)

      expect(usage).toBeDefined()
      expect(usage?.inputTokens).toBe(2500)
      expect(usage?.outputTokens).toBe(1200)
      expect(usage?.durationMs).toBe(15000)
    })

    it('should return undefined if no usage found', () => {
      const stdout = 'No usage here'

      const usage = (executor as any).extractUsageMetrics(stdout)

      expect(usage).toBeUndefined()
    })

    it('should return undefined for malformed usage', () => {
      const stdout = 'Usage: input=abc output=def'

      const usage = (executor as any).extractUsageMetrics(stdout)

      expect(usage).toBeUndefined()
    })
  })

  describe('parseArtifacts', () => {
    it('should return empty array if artifacts directory does not exist', () => {
      const artifacts = (executor as any).parseArtifacts('/non-existent-path')

      expect(artifacts).toEqual([])
    })
  })

  describe('writeInputFile', () => {
    it('should write requirement without plan context for planner', async () => {
      const testDir = `/tmp/test-${Date.now()}`
      const input: AgentExecutionInput = {
        agentType: AgentType.PLANNER,
        requirement: 'Test requirement',
        repoPath: '/repo',
        workspacePath: testDir,
        timeoutMs: 30000,
        config: {},
      }

      try {
        const filePath = await (executor as any).writeInputFile(input)

        expect(fs.existsSync(filePath)).toBe(true)

        const content = fs.readFileSync(filePath, 'utf-8')
        expect(content).toBe('Test requirement')
        expect(content).not.toContain('Plan Context')
      } finally {
        // Cleanup
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true })
        }
      }
    })

    it('should prepend plan context for implementer', async () => {
      const testDir = `/tmp/test-${Date.now()}`
      const input: AgentExecutionInput = {
        agentType: AgentType.IMPLEMENTER,
        requirement: 'Implement feature X',
        planContext: 'Plan: Build feature X with Y pattern',
        repoPath: '/repo',
        workspacePath: testDir,
        timeoutMs: 30000,
        config: {},
      }

      try {
        const filePath = await (executor as any).writeInputFile(input)

        expect(fs.existsSync(filePath)).toBe(true)

        const content = fs.readFileSync(filePath, 'utf-8')
        expect(content).toContain('# Plan Context')
        expect(content).toContain('Plan: Build feature X with Y pattern')
        expect(content).toContain('# Requirement')
        expect(content).toContain('Implement feature X')
      } finally {
        // Cleanup
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true })
        }
      }
    })
  })
})
