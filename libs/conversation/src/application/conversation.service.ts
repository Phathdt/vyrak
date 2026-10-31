import { Inject, Injectable } from '@nestjs/common'

import { CONVERSATION_REPOSITORY, type IConversationRepository } from '../domain/repositories/conversation.repository'

import type {
  ConversationMessage,
  ConversationPhase,
  ConversationSession,
  CreateMessageInput,
  CreateSessionInput,
  SessionWithMessages,
} from '../domain/entities/conversation.entity'

@Injectable()
export class ConversationService {
  constructor(@Inject(CONVERSATION_REPOSITORY) private readonly repository: IConversationRepository) {}

  /**
   * Start a new conversation session for a workflow phase
   */
  async startSession(input: CreateSessionInput): Promise<ConversationSession> {
    // Check if there's already an active session
    const existingSession = await this.repository.findActiveSessionByWorkflowAndPhase(input.workflowId, input.phase)

    if (existingSession) {
      return existingSession
    }

    return this.repository.createSession(input)
  }

  /**
   * Get or create active session for workflow phase
   */
  async getOrCreateSession(workflowId: string, phase: string): Promise<ConversationSession> {
    const existing = await this.repository.findActiveSessionByWorkflowAndPhase(workflowId, phase)

    if (existing) {
      return existing
    }

    return this.repository.createSession({
      workflowId,
      phase: phase as ConversationPhase,
    })
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    return this.repository.findSessionById(sessionId)
  }

  /**
   * Get session with all messages
   */
  async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
    return this.repository.getSessionWithMessages(sessionId)
  }

  /**
   * Get all sessions for a workflow
   */
  async getWorkflowSessions(workflowId: string): Promise<ConversationSession[]> {
    return this.repository.findSessionsByWorkflow(workflowId)
  }

  /**
   * Add a message to a session
   */
  async addMessage(input: CreateMessageInput): Promise<ConversationMessage> {
    return this.repository.createMessage(input)
  }

  /**
   * Get all messages in a session
   */
  async getMessages(sessionId: string): Promise<ConversationMessage[]> {
    return this.repository.findMessagesBySession(sessionId)
  }

  /**
   * Complete a conversation session
   */
  async completeSession(sessionId: string): Promise<ConversationSession> {
    return this.repository.updateSessionStatus(sessionId, 'COMPLETED', new Date())
  }

  /**
   * Archive a conversation session
   */
  async archiveSession(sessionId: string): Promise<ConversationSession> {
    return this.repository.updateSessionStatus(sessionId, 'ARCHIVED', new Date())
  }

  /**
   * Get message count for a session
   */
  async getMessageCount(sessionId: string): Promise<number> {
    return this.repository.countMessagesBySession(sessionId)
  }

  /**
   * Check if session has enough messages for classification
   */
  async canClassify(sessionId: string, minMessages: number = 8): Promise<boolean> {
    const count = await this.getMessageCount(sessionId)
    return count >= minMessages
  }
}
