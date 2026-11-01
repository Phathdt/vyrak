import type { AgentRequest, AgentResponse, BrainstormingContext, WorkflowClassification } from '../entities'

/**
 * AI Agent Service Interface - Business logic contract
 */
export interface IAIAgentService {
  /**
   * Send a chat message and get response (Messages API)
   */
  chat(request: AgentRequest): Promise<AgentResponse>

  /**
   * Stream chat response for real-time interaction
   */
  chatStream(request: AgentRequest): AsyncGenerator<string, void, unknown>

  /**
   * Run agent with tools (Agent SDK)
   */
  runAgent(request: AgentRequest): Promise<AgentResponse>

  /**
   * Smart routing - use agent mode when tools are needed
   */
  smartChat(request: AgentRequest): Promise<AgentResponse>

  /**
   * Start brainstorming session with initial prompt
   */
  startBrainstorming(context: BrainstormingContext): Promise<AgentResponse>

  /**
   * Continue brainstorming conversation
   */
  continueBrainstorming(context: BrainstormingContext, userMessage: string): Promise<AgentResponse>

  /**
   * Classify workflow based on conversation history
   */
  classifyWorkflow(context: BrainstormingContext): Promise<WorkflowClassification>

  /**
   * Check if enough information has been gathered for classification
   */
  shouldClassify(context: BrainstormingContext): boolean
}
