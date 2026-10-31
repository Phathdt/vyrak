import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import { WorkflowBrainstormingService, type BrainstormRequest } from './workflow-brainstorming.service'

import type { AIAgentService } from '@vyrak/ai-agent'
import type { ConversationService } from '@vyrak/conversation'
import type { ConversationMessage, ConversationSession, SessionWithMessages } from '@vyrak/conversation'

describe('WorkflowBrainstormingService', () => {
  let service: WorkflowBrainstormingService
  let mockConversationService: any
  let mockAIAgentService: any

  beforeEach(() => {
    // Mock ConversationService
    mockConversationService = {
      getOrCreateSession: vi.fn(),
      addMessage: vi.fn(),
      getMessages: vi.fn(),
      getMessageCount: vi.fn(),
      canClassify: vi.fn(),
      getSessionWithMessages: vi.fn(),
      completeSession: vi.fn(),
    }

    // Mock AIAgentService
    mockAIAgentService = {
      chat: vi.fn(),
      chatStream: vi.fn(),
      classifyWorkflow: vi.fn(),
    }

    service = new WorkflowBrainstormingService(mockConversationService, mockAIAgentService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('brainstorm() method', () => {
    it('should get or create a session for the workflow', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'What should I build?',
      }

      await service.brainstorm(request)

      expect(mockConversationService.getOrCreateSession).toHaveBeenCalledWith('workflow-123', 'BRAINSTORMING')
    })

    it('should save user message to session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'I want to add authentication',
      }

      await service.brainstorm(request)

      expect(mockConversationService.addMessage).toHaveBeenCalledWith({
        sessionId: 'session-123',
        role: 'user',
        content: 'I want to add authentication',
      })
    })

    it('should fetch all messages from session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      const mockMessages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-123',
          role: 'user',
          content: 'First message',
        },
        {
          id: 'msg-2',
          sessionId: 'session-123',
          role: 'assistant',
          content: 'Assistant response',
        },
      ]

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue(mockMessages)
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Next question',
      }

      await service.brainstorm(request)

      expect(mockConversationService.getMessages).toHaveBeenCalledWith('session-123')
    })

    it('should convert messages to AI Agent format', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      const mockMessages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-123',
          role: 'user',
          content: 'User message',
        },
      ]

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue(mockMessages)
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test message',
      }

      await service.brainstorm(request)

      expect(mockAIAgentService.chat).toHaveBeenCalledWith({
        messages: [
          {
            role: 'user',
            content: 'User message',
          },
        ],
        systemPrompt: expect.stringContaining('expert product manager'),
      })
    })

    it('should call AI agent with brainstorming system prompt', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Tell me more',
      }

      await service.brainstorm(request)

      expect(mockAIAgentService.chat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        systemPrompt: expect.stringContaining('HOTFIX'),
      })
      expect(mockAIAgentService.chat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        systemPrompt: expect.stringContaining('STORY'),
      })
      expect(mockAIAgentService.chat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        systemPrompt: expect.stringContaining('EPIC'),
      })
    })

    it('should save AI response to session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Tell me about scope' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'What do you think?',
      }

      await service.brainstorm(request)

      expect(mockConversationService.addMessage).toHaveBeenCalledWith({
        sessionId: 'session-123',
        role: 'assistant',
        content: 'Tell me about scope',
      })
    })

    it('should return correct response structure', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response content' })
      mockConversationService.getMessageCount.mockResolvedValue(8)
      mockConversationService.canClassify.mockResolvedValue(true)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result = await service.brainstorm(request)

      expect(result).toEqual({
        sessionId: 'session-123',
        aiMessage: 'AI response content',
        canClassify: true,
        messageCount: 8,
      })
    })

    it('should check if enough messages for classification', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(10)
      mockConversationService.canClassify.mockResolvedValue(true)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result = await service.brainstorm(request)

      expect(mockConversationService.canClassify).toHaveBeenCalledWith('session-123')
      expect(result.canClassify).toBe(true)
    })

    it('should return false for canClassify when not enough messages', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'AI response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result = await service.brainstorm(request)

      expect(result.canClassify).toBe(false)
    })
  })

  describe('brainstormStream() method', () => {
    it('should get or create session for streaming', async () => {
      const mockSession: ConversationSession = {
        id: 'session-456',
        workflowId: 'workflow-456',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chatStream.mockImplementation(async function* () {
        yield 'chunk1'
      })

      const request: BrainstormRequest = {
        workflowId: 'workflow-456',
        userMessage: 'Stream test',
      }

      const generator = service.brainstormStream(request)
      await generator.next()

      expect(mockConversationService.getOrCreateSession).toHaveBeenCalledWith('workflow-456', 'BRAINSTORMING')
    })

    it('should save user message for streaming', async () => {
      const mockSession: ConversationSession = {
        id: 'session-456',
        workflowId: 'workflow-456',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chatStream.mockImplementation(async function* () {
        yield 'response'
      })

      const request: BrainstormRequest = {
        workflowId: 'workflow-456',
        userMessage: 'Stream this message',
      }

      const generator = service.brainstormStream(request)
      await generator.next()

      expect(mockConversationService.addMessage).toHaveBeenCalledWith({
        sessionId: 'session-456',
        role: 'user',
        content: 'Stream this message',
      })
    })

    it('should yield chunks from stream', async () => {
      const mockSession: ConversationSession = {
        id: 'session-456',
        workflowId: 'workflow-456',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chatStream.mockImplementation(async function* () {
        yield 'Hello '
        yield 'from '
        yield 'stream'
      })

      const request: BrainstormRequest = {
        workflowId: 'workflow-456',
        userMessage: 'Test',
      }

      const generator = service.brainstormStream(request)
      const chunks: string[] = []

      for await (const chunk of generator) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello ', 'from ', 'stream'])
    })

    it('should save complete response after streaming', async () => {
      const mockSession: ConversationSession = {
        id: 'session-456',
        workflowId: 'workflow-456',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chatStream.mockImplementation(async function* () {
        yield 'Part1'
        yield 'Part2'
        yield 'Part3'
      })

      const request: BrainstormRequest = {
        workflowId: 'workflow-456',
        userMessage: 'Test',
      }

      const generator = service.brainstormStream(request)
      for await (const _ of generator) {
        // consume generator
      }

      expect(mockConversationService.addMessage).toHaveBeenCalledWith({
        sessionId: 'session-456',
        role: 'assistant',
        content: 'Part1Part2Part3',
      })
    })

    it('should accumulate full response correctly', async () => {
      const mockSession: ConversationSession = {
        id: 'session-456',
        workflowId: 'workflow-456',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])

      const responses = ['How ', 'many ', 'files ', 'will ', 'be ', 'affected?']
      mockAIAgentService.chatStream.mockImplementation(async function* () {
        for (const chunk of responses) {
          yield chunk
        }
      })

      const request: BrainstormRequest = {
        workflowId: 'workflow-456',
        userMessage: 'Test',
      }

      const generator = service.brainstormStream(request)
      for await (const _ of generator) {
        // consume
      }

      expect(mockConversationService.addMessage).toHaveBeenLastCalledWith({
        sessionId: 'session-456',
        role: 'assistant',
        content: 'How many files will be affected?',
      })
    })
  })

  describe('classify() method', () => {
    it('should fetch session with messages', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(true)
      mockAIAgentService.classifyWorkflow.mockResolvedValue({
        type: 'STORY',
        title: 'Feature',
        description: 'A feature',
      })
      mockConversationService.completeSession.mockResolvedValue({} as any)

      await service.classify('workflow-789', 'session-789')

      expect(mockConversationService.getSessionWithMessages).toHaveBeenCalledWith('session-789')
    })

    it('should throw error if session not found', async () => {
      mockConversationService.getSessionWithMessages.mockResolvedValue(null)

      await expect(service.classify('workflow-789', 'session-789')).rejects.toThrow('Session not found')
    })

    it('should throw error if session does not belong to workflow', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'different-workflow',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)

      await expect(service.classify('workflow-789', 'session-789')).rejects.toThrow(
        'Session does not belong to this workflow'
      )
    })

    it('should throw error if not enough messages for classification', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(false)

      await expect(service.classify('workflow-789', 'session-789')).rejects.toThrow(
        'Not enough messages for classification. Continue brainstorming.'
      )
    })

    it('should check if can classify before proceeding', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(true)
      mockAIAgentService.classifyWorkflow.mockResolvedValue({
        type: 'HOTFIX',
        title: 'Fix',
        description: 'A fix',
      })
      mockConversationService.completeSession.mockResolvedValue({} as any)

      await service.classify('workflow-789', 'session-789')

      expect(mockConversationService.canClassify).toHaveBeenCalledWith('session-789')
    })

    it('should convert messages to AI format for classification', async () => {
      const mockMessages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-789',
          role: 'user',
          content: 'User message',
        },
        {
          id: 'msg-2',
          sessionId: 'session-789',
          role: 'assistant',
          content: 'Assistant response',
        },
      ]

      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: mockMessages,
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(true)
      mockAIAgentService.classifyWorkflow.mockResolvedValue({
        type: 'EPIC',
        title: 'Large Initiative',
        description: 'A large initiative',
      })
      mockConversationService.completeSession.mockResolvedValue({} as any)

      await service.classify('workflow-789', 'session-789')

      expect(mockAIAgentService.classifyWorkflow).toHaveBeenCalledWith({
        workflowId: 'workflow-789',
        title: 'Workflow workflow-789',
        conversationHistory: [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant response' },
        ],
      })
    })

    it('should call AI agent with correct workflow details', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(true)
      mockAIAgentService.classifyWorkflow.mockResolvedValue({
        type: 'STORY',
        title: 'Feature',
        description: 'A feature',
      })
      mockConversationService.completeSession.mockResolvedValue({} as any)

      await service.classify('workflow-789', 'session-789')

      expect(mockAIAgentService.classifyWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-789',
          title: 'Workflow workflow-789',
        })
      )
    })

    it('should complete session after classification', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(true)
      mockAIAgentService.classifyWorkflow.mockResolvedValue({
        type: 'HOTFIX',
        title: 'Bug Fix',
        description: 'A bug fix',
      })
      mockConversationService.completeSession.mockResolvedValue({} as any)

      await service.classify('workflow-789', 'session-789')

      expect(mockConversationService.completeSession).toHaveBeenCalledWith('session-789')
    })

    it('should return classification result', async () => {
      const mockSessionWithMessages: SessionWithMessages = {
        id: 'session-789',
        workflowId: 'workflow-789',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
        messages: [],
      }

      const expectedClassification = {
        type: 'EPIC',
        title: 'Build Microservices',
        description: 'Migrate to microservices architecture',
        estimatedDuration: '2-3 weeks',
        complexity: 'HIGH',
      }

      mockConversationService.getSessionWithMessages.mockResolvedValue(mockSessionWithMessages)
      mockConversationService.canClassify.mockResolvedValue(true)
      mockAIAgentService.classifyWorkflow.mockResolvedValue(expectedClassification)
      mockConversationService.completeSession.mockResolvedValue({} as any)

      const result = await service.classify('workflow-789', 'session-789')

      expect(result).toEqual(expectedClassification)
    })
  })

  describe('Session creation vs reuse', () => {
    it('should reuse existing active session', async () => {
      const mockSession: ConversationSession = {
        id: 'session-reused',
        workflowId: 'workflow-existing',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-existing',
        userMessage: 'Continue conversation',
      }

      await service.brainstorm(request)

      // Verify that the same session ID is used consistently
      const calls = mockConversationService.addMessage.mock.calls
      expect(calls[0][0].sessionId).toBe('session-reused')
      expect(calls[1][0].sessionId).toBe('session-reused')
    })

    it('should create new session if none exists', async () => {
      const mockSession: ConversationSession = {
        id: 'session-new',
        workflowId: 'workflow-new',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-new',
        userMessage: 'Start new brainstorm',
      }

      const result = await service.brainstorm(request)

      expect(result.sessionId).toBe('session-new')
      expect(mockConversationService.getOrCreateSession).toHaveBeenCalledWith('workflow-new', 'BRAINSTORMING')
    })
  })

  describe('Message count tracking', () => {
    it('should get message count from repository', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(10)
      mockConversationService.canClassify.mockResolvedValue(true)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result = await service.brainstorm(request)

      expect(mockConversationService.getMessageCount).toHaveBeenCalledWith('session-123')
      expect(result.messageCount).toBe(10)
    })

    it('should track message count correctly after multiple exchanges', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })

      // First call: 2 messages
      mockConversationService.getMessageCount.mockResolvedValueOnce(2)
      mockConversationService.canClassify.mockResolvedValueOnce(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'First exchange',
      }

      const result1 = await service.brainstorm(request)
      expect(result1.messageCount).toBe(2)

      // Second call: 4 messages
      mockConversationService.getMessageCount.mockResolvedValueOnce(4)
      mockConversationService.canClassify.mockResolvedValueOnce(false)

      const result2 = await service.brainstorm(request)
      expect(result2.messageCount).toBe(4)
    })
  })

  describe('canClassify threshold', () => {
    it('should return canClassify=true when threshold met', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(8)
      mockConversationService.canClassify.mockResolvedValue(true)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result = await service.brainstorm(request)

      expect(result.canClassify).toBe(true)
    })

    it('should return canClassify=false when threshold not met', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(3)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result = await service.brainstorm(request)

      expect(result.canClassify).toBe(false)
    })

    it('should check canClassify for each brainstorm call', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(4)

      // First call: not ready
      mockConversationService.canClassify.mockResolvedValueOnce(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      const result1 = await service.brainstorm(request)
      expect(result1.canClassify).toBe(false)

      // Second call: ready
      mockConversationService.canClassify.mockResolvedValueOnce(true)

      const result2 = await service.brainstorm(request)
      expect(result2.canClassify).toBe(true)

      expect(mockConversationService.canClassify).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling', () => {
    it('should propagate ConversationService errors', async () => {
      mockConversationService.getOrCreateSession.mockRejectedValue(new Error('Database error'))

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      await expect(service.brainstorm(request)).rejects.toThrow('Database error')
    })

    it('should propagate AIAgentService errors', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockRejectedValue(new Error('AI service error'))

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      await expect(service.brainstorm(request)).rejects.toThrow('AI service error')
    })

    it('should handle empty user message', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: '',
      }

      const result = await service.brainstorm(request)

      expect(result).toBeDefined()
      expect(mockConversationService.addMessage).toHaveBeenCalledWith({
        sessionId: 'session-123',
        role: 'user',
        content: '',
      })
    })
  })

  describe('Private methods - toAIMessages', () => {
    it('should convert role correctly', async () => {
      const mockMessages: ConversationMessage[] = [
        {
          id: '1',
          sessionId: 'session-1',
          role: 'user',
          content: 'User message',
        },
        {
          id: '2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Assistant message',
        },
      ]

      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue(mockMessages)
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      await service.brainstorm(request)

      // Check that messages were converted properly
      expect(mockAIAgentService.chat).toHaveBeenCalledWith({
        messages: [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
        ],
        systemPrompt: expect.any(String),
      })
    })
  })

  describe('System prompt content', () => {
    it('should include HOTFIX classification criteria in prompt', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      await service.brainstorm(request)

      const systemPrompt = mockAIAgentService.chat.mock.calls[0][0].systemPrompt
      expect(systemPrompt).toContain('HOTFIX')
      expect(systemPrompt).toContain('Small urgent fixes')
    })

    it('should include STORY classification criteria in prompt', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      await service.brainstorm(request)

      const systemPrompt = mockAIAgentService.chat.mock.calls[0][0].systemPrompt
      expect(systemPrompt).toContain('STORY')
      expect(systemPrompt).toContain('Medium-sized features')
    })

    it('should include EPIC classification criteria in prompt', async () => {
      const mockSession: ConversationSession = {
        id: 'session-123',
        workflowId: 'workflow-123',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',

        updatedAt: new Date(),
      }

      mockConversationService.getOrCreateSession.mockResolvedValue(mockSession)
      mockConversationService.addMessage.mockResolvedValue({})
      mockConversationService.getMessages.mockResolvedValue([])
      mockAIAgentService.chat.mockResolvedValue({ content: 'Response' })
      mockConversationService.getMessageCount.mockResolvedValue(2)
      mockConversationService.canClassify.mockResolvedValue(false)

      const request: BrainstormRequest = {
        workflowId: 'workflow-123',
        userMessage: 'Test',
      }

      await service.brainstorm(request)

      const systemPrompt = mockAIAgentService.chat.mock.calls[0][0].systemPrompt
      expect(systemPrompt).toContain('EPIC')
      expect(systemPrompt).toContain('Large complex initiatives')
    })
  })
})
