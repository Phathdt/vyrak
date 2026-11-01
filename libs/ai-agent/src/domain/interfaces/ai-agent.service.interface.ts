import type { AgentRequest, AgentResponse, BrainstormingContext, WorkflowClassification } from '../entities'

/**
 * AI Agent Service Interface - Business logic contract
 */
export interface IAIAgentService {
  /**
   * Send a chat message and get response
   */
  chat(request: AgentRequest): Promise<AgentResponse>

  /**
   * Stream chat response for real-time interaction
   */
  chatStream(request: AgentRequest): AsyncGenerator<string, void, unknown>

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
