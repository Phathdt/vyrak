import type {
  ConversationMessage,
  ConversationPhase,
  ConversationSession,
  CreateMessageInput,
  CreateSessionInput,
  SessionWithMessages,
} from '../entities'

export interface IConversationService {
  // Session operations
  startSession(input: CreateSessionInput): Promise<ConversationSession>
  getOrCreateSession(workflowId: string, phase: ConversationPhase): Promise<ConversationSession>
  getSession(sessionId: string): Promise<ConversationSession | null>
  getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null>
  getWorkflowSessions(workflowId: string): Promise<ConversationSession[]>

  // Message operations
  addMessage(input: CreateMessageInput): Promise<ConversationMessage>
  getMessages(sessionId: string): Promise<ConversationMessage[]>
  getMessageCount(sessionId: string): Promise<number>

  // Session lifecycle
  completeSession(sessionId: string): Promise<ConversationSession>
  archiveSession(sessionId: string): Promise<ConversationSession>

  // Utilities
  canClassify(sessionId: string, minMessages?: number): Promise<boolean>
}
