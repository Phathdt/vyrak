/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import type { AgentRequest, Message, WorkflowClassification } from '../../domain'

let mockCreate: ReturnType<typeof vi.fn>
let mockStream: ReturnType<typeof vi.fn>

// Mock Anthropic SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
  mockCreate = vi.fn()
  mockStream = vi.fn()

  return {
    default: class MockAnthropicClient {
      constructor() {}
      messages = {
        create: mockCreate,
        stream: mockStream,
      }
    },
  }
})

// Mock CustomConfigService
vi.mock('@vyrak/custom-config', () => ({
  CustomConfigService: class MockCustomConfigService {
    anthropic = {
      apiKey: 'test-api-key',
      apiUrl: undefined,
      model: 'claude-sonnet-4-20250514',
    }
  },
}))

describe('ClaudeAdapter', () => {
  let adapter: any
  let mockConfigService: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Import after setting up mocks
    const { CustomConfigService } = await import('@vyrak/custom-config')
    const { ClaudeAdapter } = await import('./claude.adapter')

    mockConfigService = new CustomConfigService()
    adapter = new ClaudeAdapter(mockConfigService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('chat()', () => {
    it('should send chat request and return response with usage', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Hello Claude' }],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        usage: {
          input_tokens: 10,
          output_tokens: 8,
        },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result).toEqual({
        content: 'Hello! How can I help?',
        usage: {
          inputTokens: 10,
          outputTokens: 8,
        },
        finishReason: 'end_turn',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: 0.7,
          messages: [{ role: 'user', content: 'Hello Claude' }],
        })
      )
    })

    it('should use custom maxTokens and temperature from request', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        maxTokens: 2000,
        temperature: 0.3,
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      await adapter.chat(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
          temperature: 0.3,
        })
      )
    })

    it('should include system prompt in request', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        systemPrompt: 'You are a helpful assistant.',
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      await adapter.chat(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.',
        })
      )
    })

    it('should filter out system messages from message list', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
          { role: 'system', content: 'Another system message' },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      await adapter.chat(request)

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.messages).toHaveLength(2)
      expect(callArgs.messages).toEqual([
        { role: 'user', content: 'User message' },
        { role: 'assistant', content: 'Assistant message' },
      ])
    })

    it('should handle multi-turn conversation', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'user', content: 'What is 2+2?' },
          { role: 'assistant', content: 'The answer is 4' },
          { role: 'user', content: 'And 3+3?' },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'The answer is 6' }],
        usage: { input_tokens: 15, output_tokens: 5 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.content).toBe('The answer is 6')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'What is 2+2?' },
            { role: 'assistant', content: 'The answer is 4' },
            { role: 'user', content: 'And 3+3?' },
          ],
        })
      )
    })

    it('should handle response without finish_reason', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: null,
      })

      const result = await adapter.chat(request)

      expect(result.finishReason).toBeUndefined()
    })

    it('should throw error when response content is not text', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'image', source: { type: 'base64' } }],
        usage: { input_tokens: 5, output_tokens: 0 },
        stop_reason: 'end_turn',
      })

      await expect(adapter.chat(request)).rejects.toThrow('Unexpected response type from Claude')
    })

    it('should throw error when response has empty content array', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [],
        usage: { input_tokens: 5, output_tokens: 0 },
        stop_reason: 'end_turn',
      })

      await expect(adapter.chat(request)).rejects.toThrow()
    })

    it('should propagate API errors', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const apiError = new Error('API rate limit exceeded')
      mockCreate.mockRejectedValue(apiError)

      await expect(adapter.chat(request)).rejects.toThrow('API rate limit exceeded')
    })

    it('should handle authentication error', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const authError = new Error('Invalid API key')
      mockCreate.mockRejectedValue(authError)

      await expect(adapter.chat(request)).rejects.toThrow('Invalid API key')
    })

    it('should handle empty messages array', async () => {
      const request: AgentRequest = {
        messages: [],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 0, output_tokens: 5 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.content).toBe('Response')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
        })
      )
    })

    it('should track token usage correctly', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 123, output_tokens: 456 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.usage).toEqual({
        inputTokens: 123,
        outputTokens: 456,
      })
    })

    it('should use default values for optional parameters', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      await adapter.chat(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
          temperature: 0.7,
          system: undefined,
        })
      )
    })
  })

  describe('chatStream()', () => {
    it('should yield text chunks from stream', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          let count = 0
          return {
            next: async () => {
              if (count === 0) {
                count++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
                }
              }
              if (count === 1) {
                count++
                return { done: false, value: { type: 'content_block_delta', delta: { type: 'text_delta', text: ' ' } } }
              }
              if (count === 2) {
                count++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } },
                }
              }
              return { done: true }
            },
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', ' ', 'world'])
    })

    it('should filter out non-text delta events', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          let count = 0
          return {
            next: async () => {
              if (count === 0) {
                count++
                return { done: false, value: { type: 'content_block_start', content_block: { type: 'text' } } }
              }
              if (count === 1) {
                count++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Valid' } },
                }
              }
              if (count === 2) {
                count++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } },
                }
              }
              if (count === 3) {
                count++
                return { done: false, value: { type: 'message_stop' } }
              }
              return { done: true }
            },
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Valid'])
    })

    it('should handle empty stream', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({ done: true }),
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(0)
    })

    it('should include custom parameters in stream request', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        systemPrompt: 'Be concise',
        maxTokens: 1000,
        temperature: 0.5,
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({ done: true }),
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      for await (const _chunk of adapter.chatStream(request)) {
        // Consume generator
      }

      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'Be concise',
          max_tokens: 1000,
          temperature: 0.5,
        })
      )
    })

    it('should filter system messages from stream request', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'system', content: 'System' },
          { role: 'user', content: 'User' },
        ],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({ done: true }),
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      for await (const _chunk of adapter.chatStream(request)) {
        // Consume generator
      }

      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'User' }],
        })
      )
    })

    it('should use default values for optional stream parameters', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          return {
            next: async () => ({ done: true }),
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      for await (const _chunk of adapter.chatStream(request)) {
        // Consume generator
      }

      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
          temperature: 0.7,
        })
      )
    })

    it('should propagate stream errors', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const streamError = new Error('Stream connection failed')
      mockStream.mockRejectedValue(streamError)

      await expect(async () => {
        for await (const _chunk of adapter.chatStream(request)) {
          // Consume generator
        }
      }).rejects.toThrow('Stream connection failed')
    })

    it('should handle error during stream iteration', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          let count = 0
          return {
            next: async () => {
              if (count === 0) {
                count++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Start' } },
                }
              }
              throw new Error('Stream interrupted')
            },
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chunks: string[] = []
      let error: Error | null = null

      try {
        for await (const chunk of adapter.chatStream(request)) {
          chunks.push(chunk)
        }
      } catch (e) {
        error = e as Error
      }

      expect(chunks).toEqual(['Start'])
      expect(error?.message).toBe('Stream interrupted')
    })

    it('should handle stream with only non-delta events', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          let count = 0
          return {
            next: async () => {
              if (count === 0) {
                count++
                return { done: false, value: { type: 'message_start', message: {} } }
              }
              if (count === 1) {
                count++
                return { done: false, value: { type: 'message_stop' } }
              }
              return { done: true }
            },
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(0)
    })

    it('should yield chunks in order', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const expectedChunks = ['The', ' ', 'quick', ' ', 'brown', ' ', 'fox']

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          let index = 0
          return {
            next: async () => {
              if (index < expectedChunks.length) {
                const chunk = expectedChunks[index]
                index++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'text_delta', text: chunk } },
                }
              }
              return { done: true }
            },
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(expectedChunks)
    })
  })

  describe('classifyWorkflow()', () => {
    it('should classify workflow as HOTFIX', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'user', content: 'Critical login bug' },
          { role: 'assistant', content: 'Tell me more' },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
{
  "type": "HOTFIX",
  "confidence": 0.95,
  "reasoning": "Critical production issue affecting user access",
  "scope": "1-2 hours",
  "assumptions": ["Database is accessible"],
  "risks": ["Potential regression"]
}
          `,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.classifyWorkflow(request)

      expect(result.type).toBe('HOTFIX')
      expect(result.confidence).toBe(0.95)
      expect(result.reasoning).toContain('Critical production issue')
      expect(result.scope).toBe('1-2 hours')
      expect(result.assumptions).toContain('Database is accessible')
      expect(result.risks).toContain('Potential regression')
    })

    it('should classify workflow as STORY', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'user', content: 'Add user profile page' },
          { role: 'assistant', content: 'What features?' },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `{
  "type": "STORY",
  "confidence": 0.88,
  "reasoning": "Single feature, clear scope",
  "scope": "3-5 days",
  "assumptions": ["API exists"],
  "risks": ["Validation edge cases"]
}`,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.classifyWorkflow(request)

      expect(result.type).toBe('STORY')
      expect(result.confidence).toBe(0.88)
    })

    it('should classify workflow as EPIC', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'user', content: 'Redesign payment system' },
          { role: 'assistant', content: 'Scope?' },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `{
  "type": "EPIC",
  "confidence": 0.92,
  "reasoning": "Large initiative spanning multiple systems",
  "scope": "Several weeks",
  "assumptions": ["Team of 3+"],
  "risks": ["High complexity", "Integration challenges"]
}`,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.classifyWorkflow(request)

      expect(result.type).toBe('EPIC')
      expect(result.confidence).toBe(0.92)
      expect(result.risks).toContain('High complexity')
    })

    it('should use lower temperature for classification', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.8,
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"type": "STORY", "confidence": 0.8, "reasoning": "Test", "scope": "Unknown", "assumptions": [], "risks": []}',
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      await adapter.classifyWorkflow(request)

      // Classification should override temperature to 0.3
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        })
      )
    })

    it('should include classification prompt as system message', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"type": "STORY", "confidence": 0.8, "reasoning": "Test", "scope": "Unknown", "assumptions": [], "risks": []}',
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      await adapter.classifyWorkflow(request)

      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.system).toContain('classify this workflow')
      expect(callArgs.system).toContain('HOTFIX')
      expect(callArgs.system).toContain('STORY')
      expect(callArgs.system).toContain('EPIC')
    })

    it('should parse JSON from response with surrounding text', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `Based on the conversation, here's my classification:

{
  "type": "HOTFIX",
  "confidence": 0.9,
  "reasoning": "Urgent issue",
  "scope": "1 hour",
  "assumptions": [],
  "risks": []
}

This should be fixed immediately.`,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.classifyWorkflow(request)

      expect(result.type).toBe('HOTFIX')
      expect(result.confidence).toBe(0.9)
    })

    it('should throw error when response has no JSON', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'No JSON in this response',
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      await expect(adapter.classifyWorkflow(request)).rejects.toThrow('No JSON found in response')
    })

    it('should throw error when JSON is invalid', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{invalid json without closing brace',
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      await expect(adapter.classifyWorkflow(request)).rejects.toThrow('Failed to parse classification response')
    })

    it('should handle malformed JSON in response', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `{
  "type": "STORY",
  "confidence": "not a number",
  "reasoning": "Test"
}`,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      // Should still parse, even with unexpected types
      const result = await adapter.classifyWorkflow(request)
      expect(result.type).toBe('STORY')
    })

    it('should propagate API errors during classification', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const apiError = new Error('Service unavailable')
      mockCreate.mockRejectedValue(apiError)

      await expect(adapter.classifyWorkflow(request)).rejects.toThrow('Service unavailable')
    })

    it('should handle multiline JSON in response', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `{
  "type": "EPIC",
  "confidence": 0.85,
  "reasoning": "Multi\\nline\\nreasoning",
  "scope": "Multi\\nline\\nscope",
  "assumptions": ["Assumption 1", "Assumption 2"],
  "risks": ["Risk 1", "Risk 2"]
}`,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.classifyWorkflow(request)

      expect(result.type).toBe('EPIC')
      expect(result.assumptions).toHaveLength(2)
      expect(result.risks).toHaveLength(2)
    })

    it('should handle JSON with extra fields', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `{
  "type": "STORY",
  "confidence": 0.8,
  "reasoning": "Test",
  "scope": "Unknown",
  "assumptions": [],
  "risks": [],
  "extraField": "should be ignored",
  "anotherExtra": 123
}`,
          },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.classifyWorkflow(request)

      expect(result.type).toBe('STORY')
      expect(result.confidence).toBe(0.8)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle multiple consecutive chat requests', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      const request1: AgentRequest = {
        messages: [{ role: 'user', content: 'First' }],
      }

      const request2: AgentRequest = {
        messages: [{ role: 'user', content: 'Second' }],
      }

      const result1 = await adapter.chat(request1)
      const result2 = await adapter.chat(request2)

      expect(result1.content).toBe('Response')
      expect(result2.content).toBe('Response')
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent chat requests', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      const requests = [
        { messages: [{ role: 'user', content: 'Request 1' }] },
        { messages: [{ role: 'user', content: 'Request 2' }] },
        { messages: [{ role: 'user', content: 'Request 3' }] },
      ]

      const results = await Promise.all(requests.map((req) => adapter.chat(req)))

      expect(results).toHaveLength(3)
      expect(mockCreate).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed operations (chat and stream)', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Chat response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      const mockStreamObject = {
        [Symbol.asyncIterator]() {
          let count = 0
          return {
            next: async () => {
              if (count === 0) {
                count++
                return {
                  done: false,
                  value: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Stream' } },
                }
              }
              return { done: true }
            },
          }
        },
      }

      mockStream.mockResolvedValue(mockStreamObject)

      const chatRequest: AgentRequest = {
        messages: [{ role: 'user', content: 'Chat' }],
      }

      const streamRequest: AgentRequest = {
        messages: [{ role: 'user', content: 'Stream' }],
      }

      const chatResult = await adapter.chat(chatRequest)

      const streamChunks: string[] = []
      for await (const chunk of adapter.chatStream(streamRequest)) {
        streamChunks.push(chunk)
      }

      expect(chatResult.content).toBe('Chat response')
      expect(streamChunks).toEqual(['Stream'])
    })
  })

  describe('Edge cases', () => {
    it('should handle very long conversation', async () => {
      const longMessages: Message[] = Array.from({ length: 50 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }))

      const request: AgentRequest = {
        messages: longMessages,
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 500, output_tokens: 50 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.content).toBe('Response')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: longMessages,
        })
      )
    })

    it('should handle messages with special characters', async () => {
      const request: AgentRequest = {
        messages: [
          {
            role: 'user',
            content: 'Special chars: @#$%^&*()_+-=[]{}|;:\'",.<>?/\\~`',
          },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.content).toBe('Response')
    })

    it('should handle messages with unicode content', async () => {
      const request: AgentRequest = {
        messages: [
          {
            role: 'user',
            content: 'Unicode: 你好世界 🌍 مرحبا العالم',
          },
        ],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.content).toBe('Response')
    })

    it('should handle very large token usage', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 999999, output_tokens: 888888 },
        stop_reason: 'end_turn',
      })

      const result = await adapter.chat(request)

      expect(result.usage?.inputTokens).toBe(999999)
      expect(result.usage?.outputTokens).toBe(888888)
    })

    it('should handle temperature at boundaries (0.0 and 2.0)', async () => {
      const request1: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 0.1,
      }

      const request2: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 2.0,
      }

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      await adapter.chat(request1)
      const call1Args = mockCreate.mock.calls[0][0]
      expect(call1Args.temperature).toBe(0.1)

      mockCreate.mockClear()
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      })

      await adapter.chat(request2)
      const call2Args = mockCreate.mock.calls[0][0]
      expect(call2Args.temperature).toBe(2.0)
    })

    it('should handle stop_reason values', async () => {
      const testReasons = ['end_turn', 'max_tokens', 'stop_sequence', 'tool_use']

      for (const reason of testReasons) {
        mockCreate.mockClear()
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 5, output_tokens: 3 },
          stop_reason: reason,
        })

        const result = await adapter.chat({
          messages: [{ role: 'user', content: 'Test' }],
        })

        expect(result.finishReason).toBe(reason)
      }
    })
  })
})
