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
1. **What needs to be built or fixed** - The core problem or feature request
2. **Scope and complexity** - How many components/systems are affected
3. **Technical requirements** - Technologies, integrations, data changes needed
4. **Expected outcomes** - Success criteria and business impact
5. **Timeline urgency** - Is this blocking production? Critical bug? Can it wait?

**Classification Criteria:**

**HOTFIX** - Small urgent fixes:
- Single file or component change
- Bug fix or critical production issue
- Takes < 2 hours to implement
- No new features, just fixes existing functionality
- High urgency, needs immediate deployment
- Examples: Fix broken login, patch security vulnerability, fix payment processing error

**STORY** - Medium-sized features or enhancements:
- Affects 2-5 files or components
- New feature or significant enhancement
- Takes 1-3 days to implement
- May require API changes or database migrations
- Normal priority, planned work
- Examples: Add email notifications, implement file upload, create new API endpoint

**EPIC** - Large complex initiatives:
- Affects multiple systems or services
- Requires coordination across teams
- Takes 1+ weeks or multiple sprints
- Needs architecture design and planning
- Can be broken down into multiple stories
- Examples: Build new authentication system, implement real-time collaboration, migrate to microservices

**Conversation Strategy:**
1. Start by understanding the core request (1-2 questions)
2. Assess scope and complexity (2-3 questions)
3. Clarify technical details and urgency (1-2 questions)
4. After 4-5 exchanges, you should have enough context to recommend classification

Be conversational and natural. Ask one focused question at a time.
Probe deeper when answers are vague.
Help the user articulate what they really need.`
  }
}
