export type ConversationPhase = 'BRAINSTORMING' | 'PLANNING' | 'IMPLEMENTATION' | 'REVIEW' | 'TESTING'

export type ConversationStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ConversationSession {
  id: string
  workflowId: string
  phase: ConversationPhase
  status: ConversationStatus
  metadata?: Record<string, unknown>
  startedAt: Date
  endedAt?: Date
}

export interface ConversationMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  metadata?: {
    tokens?: number
    model?: string
    timestamp?: string
    [key: string]: unknown
  }
  createdAt: Date
}

export interface CreateSessionInput {
  workflowId: string
  phase: ConversationPhase
  metadata?: Record<string, unknown>
}

export interface CreateMessageInput {
  sessionId: string
  role: MessageRole
  content: string
  metadata?: Record<string, unknown>
}

export interface SessionWithMessages extends ConversationSession {
  messages: ConversationMessage[]
}
