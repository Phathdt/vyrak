import { describe, it, expect, beforeEach, vi } from 'vitest'

import { AIAgentService } from './ai-agent.service'

import type {
  AgentRequest,
  AgentResponse,
  BrainstormingContext,
  IAIAgentPort,
  Message,
  WorkflowClassification,
} from '../domain'

describe('AIAgentService', () => {
  let service: AIAgentService
  let mockAIAgentPort: { [K in keyof IAIAgentPort]: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockAIAgentPort = {
      chat: vi.fn(),
      chatStream: vi.fn(),
      classifyWorkflow: vi.fn(),
    }

    service = new AIAgentService(mockAIAgentPort as unknown as IAIAgentPort)
  })

  describe('chat()', () => {
    it('should send chat request and return response', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const response: AgentResponse = {
        content: 'Hi there!',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
        },
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)

      expect(result).toEqual(response)
      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(request)
      expect(mockAIAgentPort.chat).toHaveBeenCalledTimes(1)
    })

    it('should handle chat request with system prompt', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Help me' }],
        systemPrompt: 'You are a helpful assistant',
        temperature: 0.7,
        maxTokens: 200,
      }

      const response: AgentResponse = {
        content: 'I can help with that',
        finishReason: 'stop',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)

      expect(result).toEqual(response)
      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(request)
    })

    it('should handle empty messages array', async () => {
      const request: AgentRequest = {
        messages: [],
      }

      const response: AgentResponse = {
        content: 'No messages provided',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)

      expect(result).toEqual(response)
      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(request)
    })

    it('should handle multiple messages in conversation', async () => {
      const request: AgentRequest = {
        messages: [
          { role: 'user', content: 'What is 2+2?' },
          { role: 'assistant', content: 'The answer is 4' },
          { role: 'user', content: 'And 3+3?' },
        ],
      }

      const response: AgentResponse = {
        content: 'The answer is 6',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)

      expect(result).toEqual(response)
      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(request)
    })

    it('should propagate errors from port', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
      }

      const error = new Error('AI service unavailable')
      mockAIAgentPort.chat.mockRejectedValue(error)

      await expect(service.chat(request)).rejects.toThrow('AI service unavailable')
      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(request)
    })
  })

  describe('chatStream()', () => {
    it('should return async generator for streaming', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Stream this' }],
        stream: true,
      }

      async function* mockGenerator() {
        yield 'Hello'
        yield ' '
        yield 'world'
      }

      mockAIAgentPort.chatStream.mockReturnValue(mockGenerator())

      const generator = service.chatStream(request)
      const results: string[] = []

      for await (const chunk of generator) {
        results.push(chunk)
      }

      expect(results).toEqual(['Hello', ' ', 'world'])
      expect(mockAIAgentPort.chatStream).toHaveBeenCalledWith(request)
    })

    it('should handle streaming with empty chunks', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Empty stream' }],
      }

      async function* mockGenerator() {
        yield ''
        yield 'content'
        yield ''
      }

      mockAIAgentPort.chatStream.mockReturnValue(mockGenerator())

      const generator = service.chatStream(request)
      const results: string[] = []

      for await (const chunk of generator) {
        results.push(chunk)
      }

      expect(results).toContain('content')
      expect(mockAIAgentPort.chatStream).toHaveBeenCalledWith(request)
    })

    it('should handle streaming error', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Error stream' }],
      }

      async function* errorGenerator() {
        yield 'Start'
        throw new Error('Stream interrupted')
      }

      mockAIAgentPort.chatStream.mockReturnValue(errorGenerator())

      const generator = service.chatStream(request)
      const results: string[] = []

      let thrownError: Error | null = null
      try {
        for await (const chunk of generator) {
          results.push(chunk)
        }
      } catch (error) {
        thrownError = error as Error
      }

      expect(results).toContain('Start')
      expect(thrownError?.message).toBe('Stream interrupted')
    })

    it('should pass correct request to port for streaming', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Stream' }],
        systemPrompt: 'Be concise',
        temperature: 0.5,
      }

      async function* mockGenerator() {
        yield 'test'
      }

      mockAIAgentPort.chatStream.mockReturnValue(mockGenerator())

      service.chatStream(request)

      expect(mockAIAgentPort.chatStream).toHaveBeenCalledWith(request)
    })
  })

  describe('startBrainstorming()', () => {
    it('should start brainstorming session with title only', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-123',
        title: 'Implement user authentication',
        conversationHistory: [],
      }

      const response: AgentResponse = {
        content: 'Hi! I\'m here to help you plan the workflow: "Implement user authentication"',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.startBrainstorming(context)

      expect(result).toEqual(response)
      expect(mockAIAgentPort.chat).toHaveBeenCalledTimes(1)

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages).toHaveLength(1)
      expect(callArgs.messages[0].role).toBe('assistant')
      expect(callArgs.messages[0].content).toContain('Implement user authentication')
      expect(callArgs.systemPrompt).toContain('helping software teams plan')
    })

    it('should start brainstorming with title and description', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-456',
        title: 'Add payment integration',
        description: 'Integrate Stripe for processing payments',
        conversationHistory: [],
      }

      const response: AgentResponse = {
        content: 'Got it, let me help with payment integration',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.startBrainstorming(context)

      expect(result).toEqual(response)

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages[0].content).toContain('Add payment integration')
      expect(callArgs.messages[0].content).toContain('Integrate Stripe for processing payments')
    })

    it('should include system prompt for brainstorming', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-789',
        title: 'Refactor API',
        conversationHistory: [],
      }

      mockAIAgentPort.chat.mockResolvedValue({ content: 'Ready to help' })

      await service.startBrainstorming(context)

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.systemPrompt?.trim()).toContain('Ask clarifying questions')
      expect(callArgs.systemPrompt?.trim()).toContain('Help scope the work')
      expect(callArgs.systemPrompt?.trim()).toContain('conversational')
    })

    it('should propagate port errors during brainstorming start', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-error',
        title: 'Test',
        conversationHistory: [],
      }

      const error = new Error('Brainstorming failed')
      mockAIAgentPort.chat.mockRejectedValue(error)

      await expect(service.startBrainstorming(context)).rejects.toThrow('Brainstorming failed')
    })
  })

  describe('continueBrainstorming()', () => {
    it('should continue brainstorming with single previous message', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-123',
        title: 'Setup CI/CD',
        conversationHistory: [{ role: 'assistant', content: 'Let me help with CI/CD' }],
      }

      const userMessage = 'We want to use GitHub Actions'

      const response: AgentResponse = {
        content: 'Great choice! GitHub Actions is excellent for this.',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.continueBrainstorming(context, userMessage)

      expect(result).toEqual(response)

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages).toHaveLength(2)
      expect(callArgs.messages[0].role).toBe('assistant')
      expect(callArgs.messages[1]).toEqual({ role: 'user', content: userMessage })
    })

    it('should continue with full conversation history', async () => {
      const conversationHistory: Message[] = [
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'I need help with deployment' },
        { role: 'assistant', content: 'What platform are you using?' },
        { role: 'user', content: 'AWS' },
      ]

      const context: BrainstormingContext = {
        workflowId: 'wf-456',
        title: 'AWS deployment',
        conversationHistory,
      }

      const userMessage = 'We have high availability requirements'

      const response: AgentResponse = {
        content: 'That requires multi-region setup',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      await service.continueBrainstorming(context, userMessage)

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages).toHaveLength(5)
      expect(callArgs.messages[4]).toEqual({
        role: 'user',
        content: userMessage,
      })
    })

    it('should include system prompt for continuation', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-789',
        title: 'Feature planning',
        conversationHistory: [],
      }

      mockAIAgentPort.chat.mockResolvedValue({ content: 'Continuing...' })

      await service.continueBrainstorming(context, 'Tell me more')

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.systemPrompt).toContain('Ask focused questions')
      expect(callArgs.systemPrompt).toContain('HOTFIX')
      expect(callArgs.systemPrompt).toContain('STORY')
      expect(callArgs.systemPrompt).toContain('EPIC')
    })

    it('should handle empty user message', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-empty',
        title: 'Test',
        conversationHistory: [{ role: 'assistant', content: 'Initial message' }],
      }

      const response: AgentResponse = {
        content: 'Empty message received',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      await service.continueBrainstorming(context, '')

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages[1]).toEqual({ role: 'user', content: '' })
    })

    it('should preserve conversation history order', async () => {
      const conversationHistory: Message[] = [
        { role: 'assistant', content: 'First' },
        { role: 'user', content: 'Second' },
        { role: 'assistant', content: 'Third' },
      ]

      const context: BrainstormingContext = {
        workflowId: 'wf-order',
        title: 'Test',
        conversationHistory,
      }

      mockAIAgentPort.chat.mockResolvedValue({ content: 'Response' })

      await service.continueBrainstorming(context, 'Fourth')

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages.map((m) => m.content)).toEqual(['First', 'Second', 'Third', 'Fourth'])
    })

    it('should propagate port errors during continuation', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-error',
        title: 'Test',
        conversationHistory: [],
      }

      const error = new Error('Continuation failed')
      mockAIAgentPort.chat.mockRejectedValue(error)

      await expect(service.continueBrainstorming(context, 'Continue')).rejects.toThrow('Continuation failed')
    })
  })

  describe('classifyWorkflow()', () => {
    it('should classify workflow as HOTFIX', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-classify-1',
        title: 'Fix login bug',
        conversationHistory: [
          { role: 'user', content: 'User cannot login' },
          { role: 'assistant', content: 'Critical issue?' },
          { role: 'user', content: 'Yes, affects production' },
        ],
      }

      const classification: WorkflowClassification = {
        type: 'HOTFIX',
        confidence: 0.95,
        reasoning: 'Critical production issue',
        scope: '1-2 hours',
        assumptions: ['Database is accessible', 'No schema changes needed'],
        risks: ['Potential regression in auth flow'],
      }

      mockAIAgentPort.classifyWorkflow.mockResolvedValue(classification)

      const result = await service.classifyWorkflow(context)

      expect(result).toEqual(classification)
      expect(result.type).toBe('HOTFIX')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('should classify workflow as STORY', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-classify-2',
        title: 'Add user profile page',
        description: 'Users should be able to view and edit their profile',
        conversationHistory: [
          { role: 'user', content: 'We need user profiles' },
          { role: 'assistant', content: 'What features?' },
          { role: 'user', content: 'View profile, edit name and email' },
          { role: 'assistant', content: 'Timeline?' },
          { role: 'user', content: '3-5 days' },
        ],
      }

      const classification: WorkflowClassification = {
        type: 'STORY',
        confidence: 0.88,
        reasoning: 'Single feature with clear scope',
        scope: '3-5 days',
        assumptions: ['API exists', 'Database schema ready'],
        risks: ['Validation edge cases'],
      }

      mockAIAgentPort.classifyWorkflow.mockResolvedValue(classification)

      const result = await service.classifyWorkflow(context)

      expect(result.type).toBe('STORY')
    })

    it('should classify workflow as EPIC', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-classify-3',
        title: 'Complete system redesign',
        conversationHistory: [
          { role: 'user', content: 'Redesign entire payment system' },
          { role: 'assistant', content: 'Scope?' },
          { role: 'user', content: 'Multiple services, database changes, new UI' },
          { role: 'assistant', content: 'Timeline?' },
          { role: 'user', content: 'Several weeks' },
        ],
      }

      const classification: WorkflowClassification = {
        type: 'EPIC',
        confidence: 0.92,
        reasoning: 'Large initiative spanning multiple systems',
        scope: 'Several weeks',
        assumptions: ['Team of 3+', 'Phased rollout'],
        risks: ['High complexity', 'Integration challenges', 'Data migration'],
      }

      mockAIAgentPort.classifyWorkflow.mockResolvedValue(classification)

      const result = await service.classifyWorkflow(context)

      expect(result.type).toBe('EPIC')
      expect(result.risks.length).toBeGreaterThan(0)
    })

    it('should include system prompt with context in classification', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-prompt-test',
        title: 'Test workflow',
        description: 'Test description',
        conversationHistory: [],
      }

      mockAIAgentPort.classifyWorkflow.mockResolvedValue({
        type: 'STORY',
        confidence: 0.8,
        reasoning: 'Test',
        scope: 'Unknown',
        assumptions: [],
        risks: [],
      })

      await service.classifyWorkflow(context)

      const callArgs = mockAIAgentPort.classifyWorkflow.mock.calls[0][0] as AgentRequest
      expect(callArgs.systemPrompt).toContain('Test workflow')
      expect(callArgs.systemPrompt).toContain('Test description')
    })

    it('should handle classification without description', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-no-desc',
        title: 'Minimal workflow',
        conversationHistory: [],
      }

      mockAIAgentPort.classifyWorkflow.mockResolvedValue({
        type: 'STORY',
        confidence: 0.7,
        reasoning: 'Minimal info',
        scope: 'Unknown',
        assumptions: [],
        risks: [],
      })

      await service.classifyWorkflow(context)

      const callArgs = mockAIAgentPort.classifyWorkflow.mock.calls[0][0] as AgentRequest
      expect(callArgs.systemPrompt).toContain('Minimal workflow')
      expect(callArgs.messages).toEqual(context.conversationHistory)
    })

    it('should propagate port errors during classification', async () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-classify-error',
        title: 'Test',
        conversationHistory: [],
      }

      const error = new Error('Classification service error')
      mockAIAgentPort.classifyWorkflow.mockRejectedValue(error)

      await expect(service.classifyWorkflow(context)).rejects.toThrow('Classification service error')
    })
  })

  describe('shouldClassify()', () => {
    it('should return false when fewer than 4 user messages', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-1',
        title: 'Test',
        conversationHistory: [
          { role: 'assistant', content: 'Hi' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'How can I help?' },
          { role: 'user', content: 'Help me' },
          { role: 'assistant', content: 'Sure' },
          { role: 'user', content: 'Thanks' },
        ],
      }

      expect(service.shouldClassify(context)).toBe(false)
    })

    it('should return false when fewer than 8 total messages', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-2',
        title: 'Test',
        conversationHistory: [
          { role: 'user', content: 'Message 1' },
          { role: 'assistant', content: 'Response 1' },
          { role: 'user', content: 'Message 2' },
          { role: 'assistant', content: 'Response 2' },
          { role: 'user', content: 'Message 3' },
          { role: 'assistant', content: 'Response 3' },
          { role: 'user', content: 'Message 4' },
        ],
      }

      expect(service.shouldClassify(context)).toBe(false)
    })

    it('should return true with exactly 4 user messages and 8 total messages', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-3',
        title: 'Test',
        conversationHistory: [
          { role: 'user', content: 'Message 1' },
          { role: 'assistant', content: 'Response 1' },
          { role: 'user', content: 'Message 2' },
          { role: 'assistant', content: 'Response 2' },
          { role: 'user', content: 'Message 3' },
          { role: 'assistant', content: 'Response 3' },
          { role: 'user', content: 'Message 4' },
          { role: 'assistant', content: 'Response 4' },
        ],
      }

      expect(service.shouldClassify(context)).toBe(true)
    })

    it('should return true with more than minimum messages', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-4',
        title: 'Test',
        conversationHistory: [
          { role: 'user', content: '1' },
          { role: 'assistant', content: '1' },
          { role: 'user', content: '2' },
          { role: 'assistant', content: '2' },
          { role: 'user', content: '3' },
          { role: 'assistant', content: '3' },
          { role: 'user', content: '4' },
          { role: 'assistant', content: '4' },
          { role: 'user', content: '5' },
          { role: 'assistant', content: '5' },
          { role: 'user', content: '6' },
          { role: 'assistant', content: '6' },
        ],
      }

      expect(service.shouldClassify(context)).toBe(true)
    })

    it('should return false with empty conversation history', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-empty',
        title: 'Test',
        conversationHistory: [],
      }

      expect(service.shouldClassify(context)).toBe(false)
    })

    it('should count only user messages', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-count',
        title: 'Test',
        conversationHistory: [
          { role: 'user', content: '1' },
          { role: 'user', content: '2' },
          { role: 'assistant', content: 'A' },
          { role: 'user', content: '3' },
          { role: 'assistant', content: 'B' },
          { role: 'user', content: '4' },
          { role: 'system', content: 'System' },
        ],
      }

      expect(service.shouldClassify(context)).toBe(false)
    })

    it('should return true with system messages in history', () => {
      const context: BrainstormingContext = {
        workflowId: 'wf-should-system',
        title: 'Test',
        conversationHistory: [
          { role: 'system', content: 'System init' },
          { role: 'user', content: '1' },
          { role: 'assistant', content: 'A' },
          { role: 'user', content: '2' },
          { role: 'assistant', content: 'B' },
          { role: 'user', content: '3' },
          { role: 'system', content: 'System update' },
          { role: 'assistant', content: 'C' },
          { role: 'user', content: '4' },
          { role: 'assistant', content: 'D' },
        ],
      }

      expect(service.shouldClassify(context)).toBe(true)
    })
  })

  describe('Edge cases and integration', () => {
    it('should handle null/undefined in message content', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Normal' }],
      }

      const response: AgentResponse = {
        content: 'Response',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)
      expect(result).toEqual(response)
    })

    it('should handle very long conversation histories', async () => {
      const longHistory: Message[] = Array.from({ length: 100 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }))

      const context: BrainstormingContext = {
        workflowId: 'wf-long',
        title: 'Long conversation',
        conversationHistory: longHistory,
      }

      mockAIAgentPort.chat.mockResolvedValue({ content: 'Response' })

      await service.continueBrainstorming(context, 'Continue')

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages).toHaveLength(101)
    })

    it('should handle concurrent requests independently', async () => {
      const request1: AgentRequest = {
        messages: [{ role: 'user', content: 'Request 1' }],
      }

      const request2: AgentRequest = {
        messages: [{ role: 'user', content: 'Request 2' }],
      }

      const response1: AgentResponse = { content: 'Response 1' }
      const response2: AgentResponse = { content: 'Response 2' }

      mockAIAgentPort.chat.mockResolvedValueOnce(response1).mockResolvedValueOnce(response2)

      const results = await Promise.all([service.chat(request1), service.chat(request2)])

      expect(results).toEqual([response1, response2])
      expect(mockAIAgentPort.chat).toHaveBeenCalledTimes(2)
    })

    it('should handle response with all optional fields', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const response: AgentResponse = {
        content: 'Full response',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
        finishReason: 'length',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)

      expect(result.content).toBe('Full response')
      expect(result.usage?.inputTokens).toBe(100)
      expect(result.finishReason).toBe('length')
    })

    it('should handle response with minimal fields', async () => {
      const request: AgentRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      }

      const response: AgentResponse = {
        content: 'Minimal response',
      }

      mockAIAgentPort.chat.mockResolvedValue(response)

      const result = await service.chat(request)

      expect(result.content).toBe('Minimal response')
      expect(result.usage).toBeUndefined()
      expect(result.finishReason).toBeUndefined()
    })

    it('should handle message with timestamp', async () => {
      const timestamp = new Date()
      const context: BrainstormingContext = {
        workflowId: 'wf-timestamp',
        title: 'Test',
        conversationHistory: [
          {
            role: 'user',
            content: 'Message with timestamp',
            timestamp,
          },
        ],
      }

      mockAIAgentPort.chat.mockResolvedValue({ content: 'Response' })

      await service.continueBrainstorming(context, 'Continue')

      const callArgs = mockAIAgentPort.chat.mock.calls[0][0] as AgentRequest
      expect(callArgs.messages[0].timestamp).toBe(timestamp)
    })
  })
})
