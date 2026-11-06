import { describe, expect, it } from 'vitest'

import { DisabledAiAgentAdapter } from './disabled-ai-agent.adapter'

const ERROR_MESSAGE = 'Anthropic is not configured. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'

describe('DisabledAiAgentAdapter', () => {
  const adapter = new DisabledAiAgentAdapter()
  const mockRequest = {
    messages: [{ role: 'user' as const, content: 'test' }],
  }

  describe('chat', () => {
    it('should throw configuration error', async () => {
      await expect(adapter.chat(mockRequest)).rejects.toThrow(ERROR_MESSAGE)
    })
  })

  describe('chatStream', () => {
    it('should throw configuration error', async () => {
      const generator = adapter.chatStream(mockRequest)

      await expect(generator.next()).rejects.toThrow(ERROR_MESSAGE)
    })
  })

  describe('stream', () => {
    it('should throw configuration error', async () => {
      const generator = adapter.stream({ prompt: 'test', workingDirectory: '/repo' })

      await expect(generator.next()).rejects.toThrow(ERROR_MESSAGE)
    })
  })

  describe('classifyWorkflow', () => {
    it('should throw configuration error', async () => {
      await expect(adapter.classifyWorkflow(mockRequest)).rejects.toThrow(ERROR_MESSAGE)
    })
  })
})
