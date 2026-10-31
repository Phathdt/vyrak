export const ConversationPhase = {
  BRAINSTORMING: 'BRAINSTORMING',
  PLANNING: 'PLANNING',
  IMPLEMENTATION: 'IMPLEMENTATION',
  REVIEW: 'REVIEW',
  TESTING: 'TESTING',
} as const

export type ConversationPhase = (typeof ConversationPhase)[keyof typeof ConversationPhase]

export const ConversationStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const

export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus]

export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole]

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
