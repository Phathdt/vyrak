import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FakeAgentExecutor } from './fake-agent-executor'

import { AgentCancelledError, AgentExecutionError, AgentTimeoutError } from '../../domain/errors/agent-execution.errors'
import type { AgentExecutionInput } from '../../domain/interfaces/agent-executor.interface'
import { AgentExecutionStatus, AgentType } from '../../domain/types/agent-types'

describe('FakeAgentExecutor', () => {
  let executor: FakeAgentExecutor

  const mockInput: AgentExecutionInput = {
    agentType: AgentType.PLANNER,
    requirement: 'Test requirement',
    repoPath: '/tmp/repo',
    workspacePath: '/tmp/workspace',
    timeoutMs: 30000,
    config: {},
  }

  describe('Success Scenario', () => {
    beforeEach(() => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: false,
        shouldTimeout: false,
      })
    })

    it('should return success result', async () => {
      const result = await executor.execute(mockInput)

      expect(result.status).toBe(AgentExecutionStatus.SUCCESS)
      expect(result.output).toContain('Mock Plan')
      expect(result.artifacts).toHaveLength(1)
      expect(result.artifacts[0].type).toBe('plan')
      expect(result.usage).toBeDefined()
      expect(result.usage?.inputTokens).toBe(1000)
    })

    it('should generate different output for implementer', async () => {
      const implInput = { ...mockInput, agentType: AgentType.IMPLEMENTER }
      const result = await executor.execute(implInput)

      expect(result.output).toContain('Mock Implementation')
      expect(result.artifacts).toHaveLength(2)
      expect(result.artifacts[0].type).toBe('implementation')
      expect(result.artifacts[1].type).toBe('test_results')
    })

    it('should generate different output for reviewer', async () => {
      const revInput = { ...mockInput, agentType: AgentType.REVIEWER }
      const result = await executor.execute(revInput)

      expect(result.output).toContain('Mock Review')
      expect(result.artifacts).toHaveLength(2)
      expect(result.artifacts[0].type).toBe('review')
      expect(result.artifacts[1].type).toBe('report')
    })

    it('should use custom output when provided', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: false,
        shouldTimeout: false,
        customOutput: 'Custom output text',
      })

      const result = await executor.execute(mockInput)
      expect(result.output).toBe('Custom output text')
    })

    it('should use custom artifacts when provided', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: false,
        shouldTimeout: false,
        customArtifacts: [
          { type: 'plan' as const, path: 'custom-plan.md' },
          { type: 'implementation' as const, path: 'custom-impl.ts' },
        ],
      })

      const result = await executor.execute(mockInput)
      expect(result.artifacts).toHaveLength(2)
      expect(result.artifacts[0].path).toBe('custom-plan.md')
      expect(result.artifacts[1].path).toBe('custom-impl.ts')
    })

    it('should track usage metrics', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 50,
        shouldFail: false,
        shouldTimeout: false,
      })

      const result = await executor.execute(mockInput)

      expect(result.usage).toBeDefined()
      expect(result.usage?.inputTokens).toBe(1000)
      expect(result.usage?.outputTokens).toBe(500)
      expect(result.usage?.durationMs).toBe(50)
      expect(result.exitStatus).toBe(0)
    })
  })

  describe('Failure Scenario', () => {
    beforeEach(() => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: true,
        errorCode: 'TEST_ERROR',
        errorMessage: 'Test error message',
        shouldTimeout: false,
      })
    })

    it('should throw error when shouldFail is true', async () => {
      await expect(executor.execute(mockInput)).rejects.toThrow(AgentExecutionError)
      await expect(executor.execute(mockInput)).rejects.toThrow('Test error message')
    })

    it('should use default error when no message provided', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: true,
        shouldTimeout: false,
      })

      await expect(executor.execute(mockInput)).rejects.toThrow('Simulated failure')
    })
  })

  describe('Timeout Scenario', () => {
    beforeEach(() => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: false,
        shouldTimeout: true,
      })
    })

    it('should throw timeout error', async () => {
      await expect(executor.execute(mockInput)).rejects.toThrow(AgentTimeoutError)
    })
  })

  describe('Cancellation', () => {
    it('should not throw when cancelling non-existent execution', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: false,
        shouldTimeout: false,
      })

      // Should not throw even with non-existent ID
      await expect(executor.cancel('non-existent-id')).resolves.toBeUndefined()
    })

    it('should clean up execution tracking after completion', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 10,
        shouldFail: false,
        shouldTimeout: false,
      })

      const result = await executor.execute(mockInput)
      expect(result.status).toBe(AgentExecutionStatus.SUCCESS)
      // No errors means execution was properly cleaned up
    })

    it('should cancel during execution before completion', async () => {
      executor = new FakeAgentExecutor({
        delayMs: 500,
        shouldFail: false,
        shouldTimeout: false,
      })

      const promise = executor.execute(mockInput)

      // Cancel after a short delay
      await new Promise((resolve) => setTimeout(resolve, 50))
      await executor.cancel('fake-exec-1')

      await expect(promise).rejects.toThrow(AgentCancelledError)
    })
  })
})
