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
  })
})
