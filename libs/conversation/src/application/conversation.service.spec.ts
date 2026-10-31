import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConversationService } from './conversation.service'

import type {
  ConversationMessage,
  ConversationSession,
  CreateMessageInput,
  CreateSessionInput,
  SessionWithMessages,
} from '../domain'
import type { IConversationRepository } from '../domain'

describe('ConversationService', () => {
  let service: ConversationService
  let mockRepository: vi.Mocked<IConversationRepository>

  beforeEach(() => {
    // Create mock repository with all required methods
    mockRepository = {
      createSession: vi.fn(),
      findSessionById: vi.fn(),
      findActiveSessionByWorkflowAndPhase: vi.fn(),
      findSessionsByWorkflow: vi.fn(),
      updateSessionStatus: vi.fn(),
      getSessionWithMessages: vi.fn(),
      createMessage: vi.fn(),
      findMessagesBySession: vi.fn(),
      countMessagesBySession: vi.fn(),
    }

    service = new ConversationService(mockRepository)
  })

  describe('startSession', () => {
    it('should return existing active session if found', async () => {
      const existingSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(existingSession)

      const input: CreateSessionInput = {
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      }

      const result = await service.startSession(input)

      expect(result).toEqual(existingSession)
      expect(mockRepository.findActiveSessionByWorkflowAndPhase).toHaveBeenCalledWith('workflow-1', 'BRAINSTORMING')
      expect(mockRepository.createSession).not.toHaveBeenCalled()
    })

    it('should create new session if no active session exists', async () => {
      const newSession: ConversationSession = {
        id: 'session-2',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(null)
      mockRepository.createSession.mockResolvedValue(newSession)

      const input: CreateSessionInput = {
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      }

      const result = await service.startSession(input)

      expect(result).toEqual(newSession)
      expect(mockRepository.findActiveSessionByWorkflowAndPhase).toHaveBeenCalledWith('workflow-1', 'BRAINSTORMING')
      expect(mockRepository.createSession).toHaveBeenCalledWith(input)
    })

    it('should pass metadata to repository when provided', async () => {
      const newSession: ConversationSession = {
        id: 'session-3',
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        status: 'ACTIVE',
        metadata: { contextId: 'ctx-123' },
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(null)
      mockRepository.createSession.mockResolvedValue(newSession)

      const input: CreateSessionInput = {
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        metadata: { contextId: 'ctx-123' },
      }

      const result = await service.startSession(input)

      expect(result.metadata).toEqual({ contextId: 'ctx-123' })
      expect(mockRepository.createSession).toHaveBeenCalledWith(input)
    })
  })

  describe('getOrCreateSession', () => {
    it('should return existing active session', async () => {
      const existingSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(existingSession)

      const result = await service.getOrCreateSession('workflow-1', 'BRAINSTORMING')

      expect(result).toEqual(existingSession)
      expect(mockRepository.findActiveSessionByWorkflowAndPhase).toHaveBeenCalledWith('workflow-1', 'BRAINSTORMING')
      expect(mockRepository.createSession).not.toHaveBeenCalled()
    })

    it('should create session if none exists', async () => {
      const newSession: ConversationSession = {
        id: 'session-4',
        workflowId: 'workflow-2',
        phase: 'IMPLEMENTATION',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(null)
      mockRepository.createSession.mockResolvedValue(newSession)

      const result = await service.getOrCreateSession('workflow-2', 'IMPLEMENTATION')

      expect(result).toEqual(newSession)
      expect(mockRepository.createSession).toHaveBeenCalledWith({
        workflowId: 'workflow-2',
        phase: 'IMPLEMENTATION',
      })
    })

    it('should cast phase string to ConversationPhase type', async () => {
      const newSession: ConversationSession = {
        id: 'session-5',
        workflowId: 'workflow-3',
        phase: 'REVIEW',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(null)
      mockRepository.createSession.mockResolvedValue(newSession)

      await service.getOrCreateSession('workflow-3', 'REVIEW')

      expect(mockRepository.createSession).toHaveBeenCalledWith({
        workflowId: 'workflow-3',
        phase: 'REVIEW',
      })
    })
  })

  describe('getSession', () => {
    it('should return session by ID', async () => {
      const session: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findSessionById.mockResolvedValue(session)

      const result = await service.getSession('session-1')

      expect(result).toEqual(session)
      expect(mockRepository.findSessionById).toHaveBeenCalledWith('session-1')
    })

    it('should return null if session not found', async () => {
      mockRepository.findSessionById.mockResolvedValue(null)

      const result = await service.getSession('nonexistent-session')

      expect(result).toBeNull()
      expect(mockRepository.findSessionById).toHaveBeenCalledWith('nonexistent-session')
    })
  })

  describe('getSessionWithMessages', () => {
    it('should return session with messages', async () => {
      const sessionWithMessages: SessionWithMessages = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
        messages: [
          {
            id: 'msg-1',
            sessionId: 'session-1',
            role: 'user',
            content: 'Hello',
            createdAt: new Date(),
          },
          {
            id: 'msg-2',
            sessionId: 'session-1',
            role: 'assistant',
            content: 'Hi there',
            createdAt: new Date(),
          },
        ],
      }

      mockRepository.getSessionWithMessages.mockResolvedValue(sessionWithMessages)

      const result = await service.getSessionWithMessages('session-1')

      expect(result).toEqual(sessionWithMessages)
      expect(result?.messages).toHaveLength(2)
      expect(mockRepository.getSessionWithMessages).toHaveBeenCalledWith('session-1')
    })

    it('should return null if session not found', async () => {
      mockRepository.getSessionWithMessages.mockResolvedValue(null)

      const result = await service.getSessionWithMessages('nonexistent-session')

      expect(result).toBeNull()
    })
  })

  describe('getWorkflowSessions', () => {
    it('should return all sessions for a workflow', async () => {
      const sessions: ConversationSession[] = [
        {
          id: 'session-1',
          workflowId: 'workflow-1',
          phase: 'BRAINSTORMING',
          status: 'COMPLETED',
          startedAt: new Date('2024-01-01'),
          endedAt: new Date('2024-01-02'),
        },
        {
          id: 'session-2',
          workflowId: 'workflow-1',
          phase: 'PLANNING',
          status: 'ACTIVE',
          startedAt: new Date('2024-01-02'),
        },
      ]

      mockRepository.findSessionsByWorkflow.mockResolvedValue(sessions)

      const result = await service.getWorkflowSessions('workflow-1')

      expect(result).toHaveLength(2)
      expect(result).toEqual(sessions)
      expect(mockRepository.findSessionsByWorkflow).toHaveBeenCalledWith('workflow-1')
    })

    it('should return empty array if workflow has no sessions', async () => {
      mockRepository.findSessionsByWorkflow.mockResolvedValue([])

      const result = await service.getWorkflowSessions('workflow-2')

      expect(result).toEqual([])
    })
  })

  describe('addMessage', () => {
    it('should add message to session', async () => {
      const message: ConversationMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'What should we do?',
        createdAt: new Date(),
      }

      mockRepository.createMessage.mockResolvedValue(message)

      const input: CreateMessageInput = {
        sessionId: 'session-1',
        role: 'user',
        content: 'What should we do?',
      }

      const result = await service.addMessage(input)

      expect(result).toEqual(message)
      expect(mockRepository.createMessage).toHaveBeenCalledWith(input)
    })

    it('should preserve message metadata', async () => {
      const message: ConversationMessage = {
        id: 'msg-2',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Here is the plan',
        metadata: {
          tokens: 150,
          model: 'claude-3-opus',
        },
        createdAt: new Date(),
      }

      mockRepository.createMessage.mockResolvedValue(message)

      const input: CreateMessageInput = {
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Here is the plan',
        metadata: {
          tokens: 150,
          model: 'claude-3-opus',
        },
      }

      const result = await service.addMessage(input)

      expect(result.metadata).toEqual({
        tokens: 150,
        model: 'claude-3-opus',
      })
    })
  })

  describe('getMessages', () => {
    it('should retrieve all messages for a session', async () => {
      const messages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Start',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: 'msg-3',
          sessionId: 'session-1',
          role: 'user',
          content: 'Next',
          createdAt: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      mockRepository.findMessagesBySession.mockResolvedValue(messages)

      const result = await service.getMessages('session-1')

      expect(result).toHaveLength(3)
      expect(result).toEqual(messages)
      expect(mockRepository.findMessagesBySession).toHaveBeenCalledWith('session-1')
    })

    it('should return empty array if session has no messages', async () => {
      mockRepository.findMessagesBySession.mockResolvedValue([])

      const result = await service.getMessages('session-with-no-messages')

      expect(result).toEqual([])
    })
  })

  describe('completeSession', () => {
    it('should update session status to COMPLETED', async () => {
      const completedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'COMPLETED',
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-01-02'),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(completedSession)

      const result = await service.completeSession('session-1')

      expect(result.status).toBe('COMPLETED')
      expect(result.endedAt).toBeDefined()
      expect(mockRepository.updateSessionStatus).toHaveBeenCalledWith('session-1', 'COMPLETED', expect.any(Date))
    })

    it('should set endedAt timestamp', async () => {
      const completedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        status: 'COMPLETED',
        startedAt: new Date(),
        endedAt: new Date(),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(completedSession)

      const beforeTime = new Date()
      await service.completeSession('session-1')
      const afterTime = new Date()

      const callArgs = mockRepository.updateSessionStatus.mock.calls[0]
      const passedDate = callArgs[2]

      expect(passedDate).toBeInstanceOf(Date)
      expect((passedDate as Date).getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect((passedDate as Date).getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })

  describe('archiveSession', () => {
    it('should update session status to ARCHIVED', async () => {
      const archivedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'REVIEW',
        status: 'ARCHIVED',
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-01-02'),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(archivedSession)

      const result = await service.archiveSession('session-1')

      expect(result.status).toBe('ARCHIVED')
      expect(mockRepository.updateSessionStatus).toHaveBeenCalledWith('session-1', 'ARCHIVED', expect.any(Date))
    })
  })

  describe('getMessageCount', () => {
    it('should return message count for session', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(5)

      const count = await service.getMessageCount('session-1')

      expect(count).toBe(5)
      expect(mockRepository.countMessagesBySession).toHaveBeenCalledWith('session-1')
    })

    it('should return zero for session with no messages', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(0)

      const count = await service.getMessageCount('empty-session')

      expect(count).toBe(0)
    })
  })

  describe('canClassify', () => {
    it('should return true if message count >= minMessages', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(10)

      const result = await service.canClassify('session-1', 8)

      expect(result).toBe(true)
      expect(mockRepository.countMessagesBySession).toHaveBeenCalledWith('session-1')
    })

    it('should return false if message count < minMessages', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(5)

      const result = await service.canClassify('session-1', 8)

      expect(result).toBe(false)
    })

    it('should use default minMessages of 8 if not provided', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(8)

      const result = await service.canClassify('session-1')

      expect(result).toBe(true)
      expect(mockRepository.countMessagesBySession).toHaveBeenCalledWith('session-1')
    })

    it('should return true when message count equals minMessages', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(8)

      const result = await service.canClassify('session-1', 8)

      expect(result).toBe(true)
    })

    it('should return false when message count is one less than minMessages', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(7)

      const result = await service.canClassify('session-1', 8)

      expect(result).toBe(false)
    })

    it('should handle custom minMessages values', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(3)

      const result = await service.canClassify('session-1', 3)

      expect(result).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should propagate repository errors from startSession', async () => {
      const error = new Error('Database error')
      mockRepository.findActiveSessionByWorkflowAndPhase.mockRejectedValue(error)

      const input: CreateSessionInput = {
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      }

      await expect(service.startSession(input)).rejects.toThrow('Database error')
    })

    it('should propagate repository errors from addMessage', async () => {
      const error = new Error('Validation error')
      mockRepository.createMessage.mockRejectedValue(error)

      const input: CreateMessageInput = {
        sessionId: 'session-1',
        role: 'user',
        content: 'Test',
      }

      await expect(service.addMessage(input)).rejects.toThrow('Validation error')
    })

    it('should propagate repository errors from completeSession', async () => {
      const error = new Error('Session not found')
      mockRepository.updateSessionStatus.mockRejectedValue(error)

      await expect(service.completeSession('nonexistent')).rejects.toThrow('Session not found')
    })

    it('should propagate repository errors from getSession', async () => {
      const error = new Error('Database connection failed')
      mockRepository.findSessionById.mockRejectedValue(error)

      await expect(service.getSession('session-1')).rejects.toThrow('Database connection failed')
    })

    it('should propagate repository errors from getSessionWithMessages', async () => {
      const error = new Error('Query timeout')
      mockRepository.getSessionWithMessages.mockRejectedValue(error)

      await expect(service.getSessionWithMessages('session-1')).rejects.toThrow('Query timeout')
    })

    it('should propagate repository errors from getWorkflowSessions', async () => {
      const error = new Error('Workflow not found')
      mockRepository.findSessionsByWorkflow.mockRejectedValue(error)

      await expect(service.getWorkflowSessions('workflow-1')).rejects.toThrow('Workflow not found')
    })

    it('should propagate repository errors from getMessages', async () => {
      const error = new Error('Session data corrupted')
      mockRepository.findMessagesBySession.mockRejectedValue(error)

      await expect(service.getMessages('session-1')).rejects.toThrow('Session data corrupted')
    })

    it('should propagate repository errors from getMessageCount', async () => {
      const error = new Error('Count query failed')
      mockRepository.countMessagesBySession.mockRejectedValue(error)

      await expect(service.getMessageCount('session-1')).rejects.toThrow('Count query failed')
    })

    it('should propagate repository errors from canClassify', async () => {
      const error = new Error('Classification check failed')
      mockRepository.countMessagesBySession.mockRejectedValue(error)

      await expect(service.canClassify('session-1')).rejects.toThrow('Classification check failed')
    })

    it('should propagate repository errors from archiveSession', async () => {
      const error = new Error('Archive operation failed')
      mockRepository.updateSessionStatus.mockRejectedValue(error)

      await expect(service.archiveSession('session-1')).rejects.toThrow('Archive operation failed')
    })

    it('should propagate repository errors from getOrCreateSession', async () => {
      const error = new Error('Creation failed')
      mockRepository.findActiveSessionByWorkflowAndPhase.mockRejectedValue(error)

      await expect(service.getOrCreateSession('workflow-1', 'BRAINSTORMING')).rejects.toThrow('Creation failed')
    })
  })

  describe('Session lifecycle transitions', () => {
    it('should transition from ACTIVE to COMPLETED', async () => {
      const completedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'COMPLETED',
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-01-02'),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(completedSession)

      const result = await service.completeSession('session-1')

      expect(result.status).toBe('COMPLETED')
      expect(result.startedAt).toEqual(new Date('2024-01-01'))
    })

    it('should transition from ACTIVE to ARCHIVED', async () => {
      const archivedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ARCHIVED',
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-01-03'),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(archivedSession)

      const result = await service.archiveSession('session-1')

      expect(result.status).toBe('ARCHIVED')
      expect(result.startedAt).toEqual(new Date('2024-01-01'))
    })

    it('should handle archiveSession with endedAt timestamp', async () => {
      const archivedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        status: 'ARCHIVED',
        startedAt: new Date(),
        endedAt: new Date(),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(archivedSession)

      const beforeTime = new Date()
      await service.archiveSession('session-1')
      const afterTime = new Date()

      const callArgs = mockRepository.updateSessionStatus.mock.calls[0]
      const passedDate = callArgs[2]

      expect(passedDate).toBeInstanceOf(Date)
      expect((passedDate as Date).getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect((passedDate as Date).getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })

  describe('Message variations', () => {
    it('should handle messages with only user role', async () => {
      const messages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'First question',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'user',
          content: 'Second question',
          createdAt: new Date(),
        },
      ]

      mockRepository.findMessagesBySession.mockResolvedValue(messages)

      const result = await service.getMessages('session-1')

      expect(result).toHaveLength(2)
      expect(result.every((msg) => msg.role === 'user')).toBe(true)
    })

    it('should handle messages with only assistant role', async () => {
      const messages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'First response',
          createdAt: new Date(),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Second response',
          createdAt: new Date(),
        },
      ]

      mockRepository.findMessagesBySession.mockResolvedValue(messages)

      const result = await service.getMessages('session-1')

      expect(result).toHaveLength(2)
      expect(result.every((msg) => msg.role === 'assistant')).toBe(true)
    })

    it('should handle empty messages array', async () => {
      mockRepository.findMessagesBySession.mockResolvedValue([])

      const result = await service.getMessages('session-1')

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should preserve message order', async () => {
      const messages: ConversationMessage[] = [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'First',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Second',
          createdAt: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: 'msg-3',
          sessionId: 'session-1',
          role: 'user',
          content: 'Third',
          createdAt: new Date('2024-01-01T10:02:00Z'),
        },
      ]

      mockRepository.findMessagesBySession.mockResolvedValue(messages)

      const result = await service.getMessages('session-1')

      expect(result[0].content).toBe('First')
      expect(result[1].content).toBe('Second')
      expect(result[2].content).toBe('Third')
    })

    it('should handle messages with special characters in content', async () => {
      const message: ConversationMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'user',
        content: 'Special chars: @#$%^&*()_+-=[]{}|;:",.<>?/',
        createdAt: new Date(),
      }

      mockRepository.createMessage.mockResolvedValue(message)

      const input: CreateMessageInput = {
        sessionId: 'session-1',
        role: 'user',
        content: 'Special chars: @#$%^&*()_+-=[]{}|;:",.<>?/',
      }

      const result = await service.addMessage(input)

      expect(result.content).toBe('Special chars: @#$%^&*()_+-=[]{}|;:",.<>?/')
    })

    it('should handle very long message content', async () => {
      const longContent = 'x'.repeat(10000)
      const message: ConversationMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'assistant',
        content: longContent,
        createdAt: new Date(),
      }

      mockRepository.createMessage.mockResolvedValue(message)

      const input: CreateMessageInput = {
        sessionId: 'session-1',
        role: 'assistant',
        content: longContent,
      }

      const result = await service.addMessage(input)

      expect(result.content).toHaveLength(10000)
      expect(result.content).toBe(longContent)
    })
  })

  describe('Session filtering and retrieval', () => {
    it('should retrieve sessions with different phases', async () => {
      const sessions: ConversationSession[] = [
        {
          id: 'session-1',
          workflowId: 'workflow-1',
          phase: 'BRAINSTORMING',
          status: 'COMPLETED',
          startedAt: new Date(),
          endedAt: new Date(),
        },
        {
          id: 'session-2',
          workflowId: 'workflow-1',
          phase: 'PLANNING',
          status: 'COMPLETED',
          startedAt: new Date(),
          endedAt: new Date(),
        },
        {
          id: 'session-3',
          workflowId: 'workflow-1',
          phase: 'IMPLEMENTATION',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      ]

      mockRepository.findSessionsByWorkflow.mockResolvedValue(sessions)

      const result = await service.getWorkflowSessions('workflow-1')

      expect(result).toHaveLength(3)
      expect(result.map((s) => s.phase)).toEqual(['BRAINSTORMING', 'PLANNING', 'IMPLEMENTATION'])
    })

    it('should handle sessions with different statuses', async () => {
      const sessions: ConversationSession[] = [
        {
          id: 'session-1',
          workflowId: 'workflow-1',
          phase: 'BRAINSTORMING',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
        {
          id: 'session-2',
          workflowId: 'workflow-1',
          phase: 'PLANNING',
          status: 'COMPLETED',
          startedAt: new Date(),
          endedAt: new Date(),
        },
        {
          id: 'session-3',
          workflowId: 'workflow-1',
          phase: 'REVIEW',
          status: 'ARCHIVED',
          startedAt: new Date(),
          endedAt: new Date(),
        },
      ]

      mockRepository.findSessionsByWorkflow.mockResolvedValue(sessions)

      const result = await service.getWorkflowSessions('workflow-1')

      expect(result).toHaveLength(3)
      expect(result.map((s) => s.status)).toEqual(['ACTIVE', 'COMPLETED', 'ARCHIVED'])
    })

    it('should handle getSessionWithMessages with various message counts', async () => {
      const sessionWithManyMessages: SessionWithMessages = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i}`,
          sessionId: 'session-1',
          role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
          content: `Message ${i}`,
          createdAt: new Date(),
        })),
      }

      mockRepository.getSessionWithMessages.mockResolvedValue(sessionWithManyMessages)

      const result = await service.getSessionWithMessages('session-1')

      expect(result?.messages).toHaveLength(100)
      expect(result?.messages?.[0].role).toBe('user')
      expect(result?.messages?.[1].role).toBe('assistant')
    })

    it('should handle getSessionWithMessages with empty messages array', async () => {
      const sessionWithNoMessages: SessionWithMessages = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
        messages: [],
      }

      mockRepository.getSessionWithMessages.mockResolvedValue(sessionWithNoMessages)

      const result = await service.getSessionWithMessages('session-1')

      expect(result?.messages).toHaveLength(0)
      expect(result?.messages).toEqual([])
    })
  })

  describe('Metadata handling', () => {
    it('should create session with metadata', async () => {
      const sessionWithMetadata: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        metadata: {
          userId: 'user-123',
          orgId: 'org-456',
          tags: ['important', 'urgent'],
        },
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(null)
      mockRepository.createSession.mockResolvedValue(sessionWithMetadata)

      const input: CreateSessionInput = {
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        metadata: {
          userId: 'user-123',
          orgId: 'org-456',
          tags: ['important', 'urgent'],
        },
      }

      const result = await service.startSession(input)

      expect(result.metadata).toEqual({
        userId: 'user-123',
        orgId: 'org-456',
        tags: ['important', 'urgent'],
      })
    })

    it('should add message with complex metadata', async () => {
      const message: ConversationMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Generated response',
        metadata: {
          model: 'claude-3-opus',
          tokens: 2048,
          temperature: 0.7,
          topP: 0.95,
          maxTokens: 4096,
          stopSequences: ['END', 'STOP'],
          source: 'brainstorming-phase',
        },
        createdAt: new Date(),
      }

      mockRepository.createMessage.mockResolvedValue(message)

      const input: CreateMessageInput = {
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Generated response',
        metadata: {
          model: 'claude-3-opus',
          tokens: 2048,
          temperature: 0.7,
          topP: 0.95,
          maxTokens: 4096,
          stopSequences: ['END', 'STOP'],
          source: 'brainstorming-phase',
        },
      }

      const result = await service.addMessage(input)

      expect(result.metadata).toEqual({
        model: 'claude-3-opus',
        tokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        maxTokens: 4096,
        stopSequences: ['END', 'STOP'],
        source: 'brainstorming-phase',
      })
    })

    it('should preserve session metadata across retrieval', async () => {
      const sessionWithMetadata: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        status: 'ACTIVE',
        metadata: { version: '1.0', priority: 'high' },
        startedAt: new Date(),
      }

      mockRepository.findSessionById.mockResolvedValue(sessionWithMetadata)

      const result = await service.getSession('session-1')

      expect(result?.metadata).toEqual({ version: '1.0', priority: 'high' })
    })
  })

  describe('Repository method calls', () => {
    it('should call repository with exact workflowId and phase', async () => {
      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValue(null)
      mockRepository.createSession.mockResolvedValue({
        id: 'session-1',
        workflowId: 'workflow-xyz',
        phase: 'IMPLEMENTATION',
        status: 'ACTIVE',
        startedAt: new Date(),
      })

      await service.startSession({
        workflowId: 'workflow-xyz',
        phase: 'IMPLEMENTATION',
      })

      expect(mockRepository.findActiveSessionByWorkflowAndPhase).toHaveBeenCalledWith('workflow-xyz', 'IMPLEMENTATION')
    })

    it('should call findSessionById with exact sessionId', async () => {
      mockRepository.findSessionById.mockResolvedValue(null)

      await service.getSession('specific-session-id-789')

      expect(mockRepository.findSessionById).toHaveBeenCalledWith('specific-session-id-789')
    })

    it('should call findSessionsByWorkflow with exact workflowId', async () => {
      mockRepository.findSessionsByWorkflow.mockResolvedValue([])

      await service.getWorkflowSessions('workflow-abc-123')

      expect(mockRepository.findSessionsByWorkflow).toHaveBeenCalledWith('workflow-abc-123')
    })

    it('should call countMessagesBySession with exact sessionId', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(42)

      const count = await service.getMessageCount('session-specific-id')

      expect(mockRepository.countMessagesBySession).toHaveBeenCalledWith('session-specific-id')
      expect(count).toBe(42)
    })

    it('should call updateSessionStatus with correct status and date for completeSession', async () => {
      const completedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'COMPLETED',
        startedAt: new Date(),
        endedAt: new Date(),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(completedSession)

      await service.completeSession('session-1')

      const calls = mockRepository.updateSessionStatus.mock.calls
      expect(calls).toHaveLength(1)
      expect(calls[0][0]).toBe('session-1')
      expect(calls[0][1]).toBe('COMPLETED')
      expect(calls[0][2]).toBeInstanceOf(Date)
    })

    it('should call updateSessionStatus with correct status and date for archiveSession', async () => {
      const archivedSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ARCHIVED',
        startedAt: new Date(),
        endedAt: new Date(),
      }

      mockRepository.updateSessionStatus.mockResolvedValue(archivedSession)

      await service.archiveSession('session-1')

      const calls = mockRepository.updateSessionStatus.mock.calls
      expect(calls).toHaveLength(1)
      expect(calls[0][0]).toBe('session-1')
      expect(calls[0][1]).toBe('ARCHIVED')
      expect(calls[0][2]).toBeInstanceOf(Date)
    })
  })

  describe('Edge cases for canClassify', () => {
    it('should return false when message count is zero', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(0)

      const result = await service.canClassify('session-1', 1)

      expect(result).toBe(false)
    })

    it('should return true when minMessages is zero', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(0)

      const result = await service.canClassify('session-1', 0)

      expect(result).toBe(true)
    })

    it('should handle large minMessages threshold', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(1000)

      const result = await service.canClassify('session-1', 999)

      expect(result).toBe(true)
    })

    it('should handle equal message count and threshold', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(50)

      const result = await service.canClassify('session-1', 50)

      expect(result).toBe(true)
    })

    it('should return true with very large message count and high threshold', async () => {
      mockRepository.countMessagesBySession.mockResolvedValue(10000)

      const result = await service.canClassify('session-1', 9999)

      expect(result).toBe(true)
    })
  })

  describe('Multiple workflow sessions', () => {
    it('should handle different workflows independently', async () => {
      const workflow1Sessions: ConversationSession[] = [
        {
          id: 'session-w1-1',
          workflowId: 'workflow-1',
          phase: 'BRAINSTORMING',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      ]

      const workflow2Sessions: ConversationSession[] = [
        {
          id: 'session-w2-1',
          workflowId: 'workflow-2',
          phase: 'PLANNING',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
        {
          id: 'session-w2-2',
          workflowId: 'workflow-2',
          phase: 'REVIEW',
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      ]

      mockRepository.findSessionsByWorkflow.mockResolvedValueOnce(workflow1Sessions)
      mockRepository.findSessionsByWorkflow.mockResolvedValueOnce(workflow2Sessions)

      const result1 = await service.getWorkflowSessions('workflow-1')
      const result2 = await service.getWorkflowSessions('workflow-2')

      expect(result1).toHaveLength(1)
      expect(result2).toHaveLength(2)
      expect(mockRepository.findSessionsByWorkflow).toHaveBeenNthCalledWith(1, 'workflow-1')
      expect(mockRepository.findSessionsByWorkflow).toHaveBeenNthCalledWith(2, 'workflow-2')
    })

    it('should handle creating sessions for different phases in same workflow', async () => {
      const brainstormSession: ConversationSession = {
        id: 'session-1',
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      const planningSession: ConversationSession = {
        id: 'session-2',
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        status: 'ACTIVE',
        startedAt: new Date(),
      }

      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValueOnce(null)
      mockRepository.createSession.mockResolvedValueOnce(brainstormSession)
      mockRepository.findActiveSessionByWorkflowAndPhase.mockResolvedValueOnce(null)
      mockRepository.createSession.mockResolvedValueOnce(planningSession)

      const result1 = await service.getOrCreateSession('workflow-1', 'BRAINSTORMING')
      const result2 = await service.getOrCreateSession('workflow-1', 'PLANNING')

      expect(result1.id).toBe('session-1')
      expect(result2.id).toBe('session-2')
      expect(result1.phase).toBe('BRAINSTORMING')
      expect(result2.phase).toBe('PLANNING')
    })
  })
})
