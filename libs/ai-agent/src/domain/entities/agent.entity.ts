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

  // Agent mode fields
  sessionId?: string // For session caching
  workingDirectory?: string // Workspace path for tools
  allowedTools?: string[] // Tool restrictions
  timeoutMs?: number // Execution timeout
  maxTurns?: number // Max agent turns (default: 8, implementation: 100)
}

/**
 * Tool Usage Metadata
 */
export interface ToolUsage {
  tool: string
  input: unknown
  output: string
  timestamp: Date
}

/**
 * AI Agent Response
 */
export interface AgentResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
    cachedTokens?: number // Cache hits
  }
  finishReason?: string

  // Tool metadata
  toolsUsed?: ToolUsage[]
  filesRead?: string[]
  filesModified?: string[]
  commandsExecuted?: string[]
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
