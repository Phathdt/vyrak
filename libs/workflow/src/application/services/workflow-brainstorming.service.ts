import { Injectable } from '@nestjs/common'
import { AIAgentService } from '@vyrak/ai-agent'
import { ConversationService } from '@vyrak/conversation'

import type { Message } from '@vyrak/ai-agent'
import type { ConversationMessage } from '@vyrak/conversation'

export interface BrainstormRequest {
  workflowId: string
  userMessage: string
}

export interface BrainstormResponse {
  sessionId: string
  aiMessage: string
  canClassify: boolean
  messageCount: number
}

@Injectable()
export class WorkflowBrainstormingService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly aiAgentService: AIAgentService
  ) {}

  async brainstorm(request: BrainstormRequest): Promise<BrainstormResponse> {
    // Get or create active brainstorming session
    const session = await this.conversationService.getOrCreateSession(request.workflowId, 'BRAINSTORMING')

    // Save user message
    await this.conversationService.addMessage({
      sessionId: session.id,
      role: 'user',
      content: request.userMessage,
    })

    // Get all messages in session
    const messages = await this.conversationService.getMessages(session.id)

    // Convert to AI Agent format
    const aiMessages = this.toAIMessages(messages)

    // Get AI response
    const aiResponse = await this.aiAgentService.chat({
      messages: aiMessages,
      systemPrompt: this.getBrainstormingSystemPrompt(),
    })

    // Save AI response
    await this.conversationService.addMessage({
      sessionId: session.id,
      role: 'assistant',
      content: aiResponse.content,
    })

    // Check if we have enough messages for classification
    const messageCount = await this.conversationService.getMessageCount(session.id)
    const canClassify = await this.conversationService.canClassify(session.id)

    return {
      sessionId: session.id,
      aiMessage: aiResponse.content,
      canClassify,
      messageCount,
    }
  }

  async *brainstormStream(request: BrainstormRequest): AsyncGenerator<string> {
    // Get or create active brainstorming session
    const session = await this.conversationService.getOrCreateSession(request.workflowId, 'BRAINSTORMING')

    // Save user message
    await this.conversationService.addMessage({
      sessionId: session.id,
      role: 'user',
      content: request.userMessage,
    })

    // Get all messages in session
    const messages = await this.conversationService.getMessages(session.id)

    // Convert to AI Agent format
    const aiMessages = this.toAIMessages(messages)

    // Stream AI response
    let fullResponse = ''
    for await (const chunk of this.aiAgentService.chatStream({
      messages: aiMessages,
      systemPrompt: this.getBrainstormingSystemPrompt(),
    })) {
      fullResponse += chunk
      yield chunk
    }

    // Save complete AI response
    await this.conversationService.addMessage({
      sessionId: session.id,
      role: 'assistant',
      content: fullResponse,
    })
  }

  async classify(workflowId: string, sessionId: string) {
    // Get session with all messages
    const sessionWithMessages = await this.conversationService.getSessionWithMessages(sessionId)

    if (!sessionWithMessages) {
      throw new Error('Session not found')
    }

    if (sessionWithMessages.workflowId !== workflowId) {
      throw new Error('Session does not belong to this workflow')
    }

    // Check if can classify
    const canClassify = await this.conversationService.canClassify(sessionId)
    if (!canClassify) {
      throw new Error('Not enough messages for classification. Continue brainstorming.')
    }

    // Convert to AI Agent format
    const aiMessages = this.toAIMessages(sessionWithMessages.messages)

    // Classify workflow
    const classification = await this.aiAgentService.classifyWorkflow({
      workflowId,
      title: `Workflow ${workflowId}`,
      conversationHistory: aiMessages,
    })

    // Complete brainstorming session
    await this.conversationService.completeSession(sessionId)

    return classification
  }

  private toAIMessages(messages: ConversationMessage[]): Message[] {
    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))
  }

  private getBrainstormingSystemPrompt(): string {
    return `You are an expert product manager helping to understand and scope a software development workflow.

Your goal is to ask clarifying questions to understand:
1. What needs to be built or fixed
2. The scope and complexity
3. Technical requirements
4. Expected outcomes

Guide the conversation naturally. Ask follow-up questions based on the user's responses.
After 4-5 exchanges, you should have enough information to classify the workflow as:
- HOTFIX: Small urgent bug fix
- STORY: Medium-sized feature or enhancement
- EPIC: Large complex feature requiring multiple stories

Be conversational, helpful, and concise. Focus on gathering the essential information needed for classification.`
  }
}
