import { Inject, Injectable } from '@nestjs/common'

import { AI_AGENT_PORT, type IAIAgentPort } from '../domain/ports/ai-agent.port'

import type {
  AgentRequest,
  AgentResponse,
  BrainstormingContext,
  WorkflowClassification,
} from '../domain/entities/agent.entity'

@Injectable()
export class AIAgentService {
  constructor(@Inject(AI_AGENT_PORT) private readonly aiAgent: IAIAgentPort) {}

  /**
   * Send a chat message and get response
   */
  async chat(request: AgentRequest): Promise<AgentResponse> {
    return this.aiAgent.chat(request)
  }

  /**
   * Stream chat response for real-time interaction
   */
  chatStream(request: AgentRequest): AsyncGenerator<string, void, unknown> {
    return this.aiAgent.chatStream(request)
  }

  /**
   * Start brainstorming session with initial prompt
   */
  async startBrainstorming(context: BrainstormingContext): Promise<AgentResponse> {
    const systemPrompt = `
You are an AI assistant helping software teams plan and organize their development workflows.

Your role is to:
1. Ask clarifying questions to understand the requirements
2. Help scope the work appropriately
3. Identify dependencies and risks
4. Guide the conversation to gather enough information for classification

Be conversational, helpful, and ask one focused question at a time.
`

    const initialMessage = `
Hi! I'm here to help you plan the workflow: "${context.title}"
${context.description ? `\nDescription: ${context.description}` : ''}

Let me understand your requirements better. Can you tell me more about what you're trying to achieve?
`

    return this.aiAgent.chat({
      messages: [
        {
          role: 'assistant',
          content: initialMessage,
        },
      ],
      systemPrompt,
    })
  }

  /**
   * Continue brainstorming conversation
   */
  async continueBrainstorming(context: BrainstormingContext, userMessage: string): Promise<AgentResponse> {
    const systemPrompt = `
You are an AI assistant helping software teams plan and organize their development workflows.

Guidelines:
- Ask focused questions to understand scope, complexity, and requirements
- Help identify if this is a bug fix (HOTFIX), single feature (STORY), or large initiative (EPIC)
- After gathering enough information (usually 4-6 exchanges), suggest moving to classification
- Be concise and conversational
`

    const messages = [
      ...context.conversationHistory,
      {
        role: 'user' as const,
        content: userMessage,
      },
    ]

    return this.aiAgent.chat({
      messages,
      systemPrompt,
    })
  }

  /**
   * Classify workflow based on conversation history
   */
  async classifyWorkflow(context: BrainstormingContext): Promise<WorkflowClassification> {
    const systemPrompt = `
Analyze the conversation about workflow: "${context.title}"
${context.description ? `Description: ${context.description}` : ''}

Based on the discussion, classify this workflow.
`

    return this.aiAgent.classifyWorkflow({
      messages: context.conversationHistory,
      systemPrompt,
    })
  }

  /**
   * Check if enough information has been gathered for classification
   */
  shouldClassify(context: BrainstormingContext): boolean {
    // Simple heuristic: at least 4 user messages and 8 total messages
    const userMessages = context.conversationHistory.filter((m) => m.role === 'user')
    return userMessages.length >= 4 && context.conversationHistory.length >= 8
  }
}
