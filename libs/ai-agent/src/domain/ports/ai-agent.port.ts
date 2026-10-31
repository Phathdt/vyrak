import type { AgentRequest, AgentResponse, WorkflowClassification } from '../entities/agent.entity'

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
 * Token for dependency injection
 */
export const AI_AGENT_PORT = Symbol('AI_AGENT_PORT')
