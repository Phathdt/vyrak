import type {
  ConversationMessage,
  ConversationSession,
  CreateMessageInput,
  CreateSessionInput,
  SessionWithMessages,
} from '../entities/conversation.entity'

export interface IConversationRepository {
  // Session operations
  createSession(input: CreateSessionInput): Promise<ConversationSession>
  findSessionById(sessionId: string): Promise<ConversationSession | null>
  findActiveSessionByWorkflowAndPhase(workflowId: string, phase: string): Promise<ConversationSession | null>
  findSessionsByWorkflow(workflowId: string): Promise<ConversationSession[]>
  updateSessionStatus(sessionId: string, status: string, endedAt?: Date): Promise<ConversationSession>
  getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null>

  // Message operations
  createMessage(input: CreateMessageInput): Promise<ConversationMessage>
  findMessagesBySession(sessionId: string): Promise<ConversationMessage[]>
  countMessagesBySession(sessionId: string): Promise<number>
}

export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY')
