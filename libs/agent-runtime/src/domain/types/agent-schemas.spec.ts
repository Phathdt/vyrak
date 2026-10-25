import { describe, expect, it } from 'vitest'

import {
  AgentConfigSchema,
  AgentExecutionInputSchema,
  AgentExecutionResultSchema,
  ArtifactReferenceSchema,
  UsageMetricsSchema,
} from './agent-schemas'
import { AgentExecutionStatus, AgentType, ArtifactType } from './agent-types'

describe('Agent Schemas', () => {
  describe('AgentConfigSchema', () => {
    it('should validate valid config', () => {
      const config = {
        model: 'claude-3-opus',
        temperature: 0.7,
        maxTokens: 4000,
      }

      const result = AgentConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should allow empty config', () => {
      const config = {}

      const result = AgentConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should reject invalid temperature', () => {
      const config = {
        temperature: 3,
      }

      const result = AgentConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('should allow additional properties', () => {
      const config = {
        model: 'claude-3-opus',
        customField: 'value',
      }

      const result = AgentConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })

  describe('ArtifactReferenceSchema', () => {
    it('should validate valid artifact reference', () => {
      const artifact = {
        type: ArtifactType.PLAN,
        path: '/tmp/plan.md',
        size: 1024,
      }

      const result = ArtifactReferenceSchema.safeParse(artifact)
      expect(result.success).toBe(true)
    })

    it('should allow artifact without size', () => {
      const artifact = {
        type: ArtifactType.REPORT,
        path: '/tmp/report.md',
      }

      const result = ArtifactReferenceSchema.safeParse(artifact)
      expect(result.success).toBe(true)
    })

    it('should reject empty path', () => {
      const artifact = {
        type: ArtifactType.PLAN,
        path: '',
      }

      const result = ArtifactReferenceSchema.safeParse(artifact)
      expect(result.success).toBe(false)
    })
  })

  describe('UsageMetricsSchema', () => {
    it('should validate valid usage metrics', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: 5000,
      }

      const result = UsageMetricsSchema.safeParse(usage)
      expect(result.success).toBe(true)
    })

    it('should reject negative tokens', () => {
      const usage = {
        inputTokens: -1,
        outputTokens: 500,
        durationMs: 5000,
      }

      const result = UsageMetricsSchema.safeParse(usage)
      expect(result.success).toBe(false)
    })

    it('should reject zero duration', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: 0,
      }

      const result = UsageMetricsSchema.safeParse(usage)
      expect(result.success).toBe(false)
    })
  })

  describe('AgentExecutionInputSchema', () => {
    it('should validate valid input', () => {
      const input = {
        agentType: AgentType.PLANNER,
        requirement: 'Implement user authentication',
        repoPath: '/tmp/repo',
        workspacePath: '/tmp/workspace',
        timeoutMs: 300000,
        config: {},
      }

      const result = AgentExecutionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should validate input with plan context', () => {
      const input = {
        agentType: AgentType.IMPLEMENTER,
        requirement: 'Implement authentication',
        planContext: 'Use JWT tokens',
        repoPath: '/tmp/repo',
        workspacePath: '/tmp/workspace',
        timeoutMs: 300000,
        config: { model: 'claude-3-opus' },
      }

      const result = AgentExecutionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject invalid timeout', () => {
      const input = {
        agentType: AgentType.PLANNER,
        requirement: 'Test',
        repoPath: '/tmp/repo',
        workspacePath: '/tmp/workspace',
        timeoutMs: -1,
        config: {},
      }

      const result = AgentExecutionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject empty requirement', () => {
      const input = {
        agentType: AgentType.PLANNER,
        requirement: '',
        repoPath: '/tmp/repo',
        workspacePath: '/tmp/workspace',
        timeoutMs: 300000,
        config: {},
      }

      const result = AgentExecutionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('AgentExecutionResultSchema', () => {
    it('should validate success result', () => {
      const result = {
        status: AgentExecutionStatus.SUCCESS,
        output: 'Plan generated',
        artifacts: [{ type: ArtifactType.PLAN, path: 'plan.md' }],
        usage: {
          inputTokens: 1000,
          outputTokens: 500,
          durationMs: 5000,
        },
      }

      const validated = AgentExecutionResultSchema.safeParse(result)
      expect(validated.success).toBe(true)
    })

    it('should validate failure result with error', () => {
      const result = {
        status: AgentExecutionStatus.FAILURE,
        artifacts: [],
        errorCode: 'EXECUTION_ERROR',
        errorMessage: 'Agent failed to execute',
        exitStatus: 1,
      }

      const validated = AgentExecutionResultSchema.safeParse(result)
      expect(validated.success).toBe(true)
    })

    it('should validate timeout result', () => {
      const result = {
        status: AgentExecutionStatus.TIMEOUT,
        artifacts: [],
        errorCode: 'AGENT_TIMEOUT',
        errorMessage: 'Execution timed out after 5 minutes',
      }

      const validated = AgentExecutionResultSchema.safeParse(result)
      expect(validated.success).toBe(true)
    })

    it('should validate cancelled result', () => {
      const result = {
        status: AgentExecutionStatus.CANCELLED,
        artifacts: [],
        errorCode: 'AGENT_CANCELLED',
        errorMessage: 'Execution was cancelled by user',
      }

      const validated = AgentExecutionResultSchema.safeParse(result)
      expect(validated.success).toBe(true)
    })

    it('should allow result without optional fields', () => {
      const result = {
        status: AgentExecutionStatus.SUCCESS,
        artifacts: [],
      }

      const validated = AgentExecutionResultSchema.safeParse(result)
      expect(validated.success).toBe(true)
    })
  })
})
