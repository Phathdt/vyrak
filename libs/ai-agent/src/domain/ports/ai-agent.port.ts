import type { AgentRequest, AgentResponse, WorkflowClassification } from '../entities'

/**
 * AI Agent Port - Interface for AI provider implementations
 */
export interface IAIAgentPort {
  /**
   * Send a message and get response
   */
  chat(request: AgentRequest): Promise<AgentResponse>

  /**
   * Stream response (for real-time chat)
   */
  chatStream(request: AgentRequest): AsyncGenerator<string, void, unknown>

  /**
   * Classify workflow based on conversation
   */
  classifyWorkflow(request: AgentRequest): Promise<WorkflowClassification>
}

/**
 * Token for dependency injection - Messages API adapter
 */
export const AI_AGENT_PORT = Symbol('AI_AGENT_PORT')

/**
 * Token for dependency injection - Chat adapter (Messages API)
 */
export const AI_AGENT_CHAT_PORT = Symbol('AI_AGENT_CHAT_PORT')

/**
 * Token for dependency injection - Agent SDK adapter
 */
export const AI_AGENT_AGENT_PORT = Symbol('AI_AGENT_AGENT_PORT')
