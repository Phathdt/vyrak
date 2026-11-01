import { ConversationPhase, ConversationStatus, IConversationService, MessageRole } from '@vyrak/conversation'
import {
  InvalidBrainstormingStateError,
  SessionError,
  WorkflowNotFoundError,
  WorkflowStatus,
  WorkflowType,
  RepositoryContextService,
} from '@vyrak/workflow-core'

import type {
  BrainstormInput,
  BrainstormResult,
  BrainstormSessionView,
  ClassifyBrainstormResult,
  IWorkflowBrainstormingService,
} from '../../domain'
import type { IAIAgentService, Message } from '@vyrak/ai-agent'
import type { ConversationMessage } from '@vyrak/conversation'
import type { IConfigService } from '@vyrak/custom-config'
import type { IWorkflowRepository } from '@vyrak/workflow-core'

export class WorkflowBrainstormingService implements IWorkflowBrainstormingService {
  private readonly model: string

  constructor(
    private readonly conversationService: IConversationService,
    private readonly aiAgentService: IAIAgentService,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly repositoryContextService: RepositoryContextService,
    private readonly configService: IConfigService
  ) {
    // Get model from config
    const anthropicConfig = this.configService.anthropic
    if (!anthropicConfig?.model) {
      throw new Error('ANTHROPIC__MODEL not configured in .env')
    }
    this.model = anthropicConfig.model
  }

  async getBrainstormSession(workflowId: string): Promise<BrainstormSessionView> {
    const sessions = await this.conversationService.getWorkflowSessions(workflowId)
    const session =
      sessions.find((s) => s.phase === ConversationPhase.BRAINSTORMING && s.status === ConversationStatus.ACTIVE) ??
      [...sessions]
        .filter((s) => s.phase === ConversationPhase.BRAINSTORMING)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]

    if (!session) {
      return {
        sessionId: null,
        messages: [],
        canClassify: false,
        messageCount: 0,
      }
    }

    const messages = await this.conversationService.getMessages(session.id)
    const messageCount = messages.length
    const canClassify = await this.conversationService.canClassify(session.id)

    return {
      sessionId: session.id,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
      canClassify,
      messageCount,
    }
  }

  async brainstorm(input: BrainstormInput): Promise<BrainstormResult> {
    await this.ensureBrainstormingStatus(input.workflowId)

    const session = await this.conversationService.getOrCreateSession(input.workflowId, ConversationPhase.BRAINSTORMING)

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.USER,
      content: input.userMessage,
    })

    const messages = await this.conversationService.getMessages(session.id)
    const aiMessages = this.toAIMessages(messages)

    // Use generic repository context service
    const repoPath = await this.repositoryContextService.resolveRepositoryPath(input.workflowId)

    let aiResponseContent: string

    if (repoPath) {
      // Use Agent SDK with repository context
      const conversationContext = aiMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n')

      const promptWithHistory = `${this.getBrainstormingSystemPrompt()}

Previous conversation:
${conversationContext}

User's latest message: ${input.userMessage}

You have access to the project repository. Use Read, Glob, and Grep tools to explore the codebase when needed to:
- Understand existing patterns and architecture
- Suggest implementations that match the codebase style
- Provide specific examples from actual code
- Give more accurate scope and complexity estimates
`

      const { query } = await import('@anthropic-ai/claude-agent-sdk')

      aiResponseContent = ''
      for await (const message of query({
        prompt: promptWithHistory,
        options: {
          model: this.model, // Use model from config (my-opus)
          allowedTools: ['Read', 'Glob', 'Grep'],
          maxTurns: 8,
          cwd: repoPath,
        },
      })) {
        if (message.type === 'result' && message.subtype === 'success' && !message.is_error) {
          aiResponseContent = message.result
        }
      }
    } else {
      // Fallback: chat without repo context
      const aiResponse = await this.aiAgentService.chat({
        messages: aiMessages,
        systemPrompt: this.getBrainstormingSystemPrompt(),
      })
      aiResponseContent = aiResponse.content
    }

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.ASSISTANT,
      content: aiResponseContent,
    })

    const messageCount = await this.conversationService.getMessageCount(session.id)
    const canClassify = await this.conversationService.canClassify(session.id)

    return {
      sessionId: session.id,
      aiMessage: aiResponseContent,
      canClassify,
      messageCount,
    }
  }

  async *brainstormStream(input: BrainstormInput): AsyncGenerator<string> {
    await this.ensureBrainstormingStatus(input.workflowId)

    const session = await this.conversationService.getOrCreateSession(input.workflowId, ConversationPhase.BRAINSTORMING)

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.USER,
      content: input.userMessage,
    })

    const messages = await this.conversationService.getMessages(session.id)
    const aiMessages = this.toAIMessages(messages)

    // Use generic repository context service
    const repoPath = await this.repositoryContextService.resolveRepositoryPath(input.workflowId)

    let fullResponse = ''

    if (repoPath) {
      // Use Agent SDK with repository context (streaming)
      const conversationContext = aiMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n')

      const promptWithHistory = `${this.getBrainstormingSystemPrompt()}

Previous conversation:
${conversationContext}

User's latest message: ${input.userMessage}

You have access to the project repository. Use Read, Glob, and Grep tools to explore the codebase when needed.
`

      const { query } = await import('@anthropic-ai/claude-agent-sdk')

      for await (const message of query({
        prompt: promptWithHistory,
        options: {
          model: this.model, // Use model from config (my-opus)
          allowedTools: ['Read', 'Glob', 'Grep'],
          maxTurns: 8,
          cwd: repoPath,
        },
      })) {
        // Agent SDK returns messages of various types
        // We only care about 'result' type with success
        if (message.type === 'result' && message.subtype === 'success' && !message.is_error) {
          fullResponse = message.result
          yield message.result
        }
      }
    } else {
      // Fallback: chat without repo context
      for await (const chunk of this.aiAgentService.chatStream({
        messages: aiMessages,
        systemPrompt: this.getBrainstormingSystemPrompt(),
      })) {
        fullResponse += chunk
        yield chunk
      }
    }

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.ASSISTANT,
      content: fullResponse,
    })
  }

  async classify(workflowId: string, sessionId: string): Promise<ClassifyBrainstormResult> {
    const sessionWithMessages = await this.conversationService.getSessionWithMessages(sessionId)

    if (!sessionWithMessages) {
      throw new SessionError('Session not found')
    }

    if (sessionWithMessages.workflowId !== workflowId) {
      throw new SessionError('Session does not belong to this workflow')
    }

    const canClassify = await this.conversationService.canClassify(sessionId)
    if (!canClassify) {
      throw new SessionError('Not enough messages for classification. Continue brainstorming.')
    }

    const aiMessages = this.toAIMessages(sessionWithMessages.messages)

    const classification = await this.aiAgentService.classifyWorkflow({
      workflowId,
      title: `Workflow ${workflowId}`,
      conversationHistory: aiMessages,
    })

    await this.conversationService.completeSession(sessionId)

    const result = {
      type: classification.type as WorkflowType,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    }

    await this.workflowRepository.updateClassification(workflowId, {
      ...result,
      proposedAt: new Date().toISOString(),
    })
    await this.workflowRepository.updateStatus(workflowId, WorkflowStatus.CLASSIFICATION_PENDING)

    return result
  }

  private async ensureBrainstormingStatus(workflowId: string): Promise<void> {
    const workflow = await this.workflowRepository.findById(workflowId)

    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    const allowedStatuses: WorkflowStatus[] = [
      WorkflowStatus.DRAFT,
      WorkflowStatus.BRAINSTORMING,
      WorkflowStatus.CLASSIFICATION_PENDING,
    ]
    const canBrainstorm = allowedStatuses.includes(workflow.status)

    if (!canBrainstorm) {
      throw new InvalidBrainstormingStateError('This workflow is no longer in the brainstorming phase')
    }

    if (workflow.status === WorkflowStatus.DRAFT) {
      await this.workflowRepository.updateStatus(workflowId, WorkflowStatus.BRAINSTORMING)
    }
  }

  private toAIMessages(messages: ConversationMessage[]): Message[] {
    return messages
      .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
      .map((msg) => ({
        role: msg.role,
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
