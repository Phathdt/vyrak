/**
 * AI Conversation Message
 */
export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

/**
 * AI Agent Request
 */
export interface AgentRequest {
  messages: Message[]
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

/**
 * AI Agent Response
 */
export interface AgentResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  finishReason?: string
}

/**
 * Workflow Classification Result
 */
export interface WorkflowClassification {
  type: 'HOTFIX' | 'STORY' | 'EPIC'
  confidence: number
  reasoning: string
  scope: string
  assumptions: string[]
  risks: string[]
}

/**
 * Brainstorming Context
 */
export interface BrainstormingContext {
  workflowId: string
  title: string
  description?: string
  conversationHistory: Message[]
}
