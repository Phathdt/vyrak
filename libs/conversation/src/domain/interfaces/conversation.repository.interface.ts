import type {
  ConversationMessage,
  ConversationPhase,
  ConversationSession,
  ConversationStatus,
  CreateMessageInput,
  CreateSessionInput,
  SessionWithMessages,
} from '../entities'

export interface IConversationRepository {
  // Session operations
  createSession(input: CreateSessionInput): Promise<ConversationSession>
  getOrCreateSession(input: CreateSessionInput): Promise<ConversationSession>
  findSessionById(sessionId: string): Promise<ConversationSession | null>
  findActiveSessionByWorkflowAndPhase(workflowId: string, phase: ConversationPhase): Promise<ConversationSession | null>
  findSessionsByWorkflow(workflowId: string): Promise<ConversationSession[]>
  updateSessionStatus(sessionId: string, status: ConversationStatus, endedAt?: Date): Promise<ConversationSession>
  getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null>

  // Message operations
  createMessage(input: CreateMessageInput): Promise<ConversationMessage>
  findMessagesBySession(sessionId: string): Promise<ConversationMessage[]>
  findMessageById(messageId: string): Promise<ConversationMessage | null>
  findMessageByEventId(eventId: string): Promise<ConversationMessage | null>
  countMessagesBySession(sessionId: string): Promise<number>
}
