import * as fs from 'fs'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AgentType, type AgentExecutionInput } from '../../../../domain'
import { ClaudeCodeExecutor } from '../../claude-code-executor'

describe('ClaudeCodeExecutor Integration', () => {
  let executor: ClaudeCodeExecutor
  const testWorkspace = `/tmp/claude-test-${Date.now()}`

  beforeAll(() => {
    // Skip if CLAUDE_API_KEY not set
    if (!process.env.CLAUDE_API_KEY) {
      console.warn('Skipping Claude integration tests: CLAUDE_API_KEY not set')
      return
    }

    executor = new ClaudeCodeExecutor()

    // Create test workspace
    fs.mkdirSync(testWorkspace, { recursive: true })
  })

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true })
    }
  })

  it(
    'should execute planner agent',
    async () => {
      if (!process.env.CLAUDE_API_KEY) return

      const input: AgentExecutionInput = {
        agentType: AgentType.PLANNER,
        requirement: 'Create a simple hello world function',
        repoPath: testWorkspace,
        workspacePath: testWorkspace,
        timeoutMs: 5 * 60 * 1000, // 5 minutes
        config: {
          model: 'claude-sonnet-4-20250514',
        },
      }

      const result = await executor.execute(input)

      expect(result.status).toBe('success')
      expect(result.output).toBeDefined()
      expect(result.artifacts.length).toBeGreaterThan(0)
    },
    5 * 60 * 1000
  ) // 5 minute timeout
})
