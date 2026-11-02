import { ArtifactEntity, IArtifactService } from '@vyrak/artifact'
import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import {
  InvalidPlanningStateError,
  WorkflowNotFoundError,
  WorkflowStatus,
  RepositoryContextService,
} from '@vyrak/workflow-core'

import type {
  IWorkflowPlanningService,
  PlanningChatInput,
} from '../../domain/interfaces/workflow-planning-service.interface'
import type {
  PlanningChatResponseDto,
  PlanningSessionResponseDto,
} from '../../domain/schemas/workflow-planning.schemas'
import type { IAIAgentService, Message } from '@vyrak/ai-agent'
import type { ConversationMessage } from '@vyrak/conversation'
import type { IConfigService } from '@vyrak/custom-config'
import type { IGitRepositoryService } from '@vyrak/project'
import type { IWorkflowRepository, IWorkflowRepositoryRepository, WorkflowRepositoryEntity } from '@vyrak/workflow-core'

export class WorkflowPlanningService implements IWorkflowPlanningService {
  private readonly model: string

  constructor(
    private readonly conversationService: IConversationService,
    private readonly aiAgentService: IAIAgentService,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryService: IGitRepositoryService,
    private readonly repositoryContextService: RepositoryContextService,
    private readonly configService: IConfigService,
    private readonly artifactService: IArtifactService
  ) {
    // Get model from config
    const anthropicConfig = this.configService.anthropic
    if (!anthropicConfig?.model) {
      throw new Error('ANTHROPIC__MODEL not configured in .env')
    }
    this.model = anthropicConfig.model
  }

  async getPlanningSession(
    workflowId: string,
    organizationId: string,
    projectId: string
  ): Promise<PlanningSessionResponseDto> {
    await this.ensurePlanningPhase(workflowId)

    const repositories = await this.loadLinkedRepositories(organizationId, projectId, workflowId)
    const sessions = await this.conversationService.getWorkflowSessions(workflowId)
    const session = this.pickPlanningSession(sessions)

    if (!session) {
      return {
        sessionId: null,
        messages: [],
        messageCount: 0,
        repositories,
      }
    }

    const messages = await this.conversationService.getMessages(session.id)

    return {
      sessionId: session.id,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
      messageCount: messages.length,
      repositories,
    }
  }

  async chat(input: PlanningChatInput): Promise<PlanningChatResponseDto> {
    const workflow = await this.ensurePlanningPhase(input.workflowId)

    const session = await this.conversationService.getOrCreateSession(input.workflowId, ConversationPhase.PLANNING)

    // Format user message with code snippets if provided
    const userContent = this.formatUserMessage(input.userMessage, input.codeSnippets)

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.USER,
      content: userContent,
    })

    const messages = await this.conversationService.getMessages(session.id)
    const aiMessages = this.toAIMessages(messages)
    const systemPrompt = await this.buildPlanningSystemPrompt(workflow, input.organizationId, input.projectId)

    // Use generic repository context service
    const repoPath = await this.repositoryContextService.resolveRepositoryPath(input.workflowId)

    let aiResponseContent: string

    if (repoPath) {
      // Use Agent SDK with repository context
      const conversationContext = aiMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n')

      const promptWithHistory = `${systemPrompt}

Previous conversation:
${conversationContext}

User's latest message: ${input.userMessage}

You have access to the project repository. Use Read, Glob, and Grep tools to explore the codebase when needed to:
- Understand existing architecture and patterns
- Identify files and components to modify
- Estimate complexity based on actual code structure
- Provide specific implementation guidance
- Create detailed, accurate plans
`

      const { query } = await import('@anthropic-ai/claude-agent-sdk')

      aiResponseContent = ''
      for await (const message of query({
        prompt: promptWithHistory,
        options: {
          model: this.model,
          allowedTools: ['Read', 'Glob', 'Grep'],
          maxTurns: 10,
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
        systemPrompt,
        temperature: 0.3,
        maxTokens: 4096,
      })
      aiResponseContent = aiResponse.content
    }

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.ASSISTANT,
      content: aiResponseContent,
    })

    const messageCount = await this.conversationService.getMessageCount(session.id)

    return {
      sessionId: session.id,
      aiMessage: aiResponseContent,
      messageCount,
      repoFilesLoaded: repoPath ? [{ path: repoPath, bytes: 0 }] : [],
    }
  }

  private pickPlanningSession(sessions: Awaited<ReturnType<IConversationService['getWorkflowSessions']>>) {
    return (
      sessions.find((s) => s.phase === ConversationPhase.PLANNING) ??
      [...sessions]
        .filter((s) => s.phase === ConversationPhase.PLANNING)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
    )
  }

  private async ensurePlanningPhase(workflowId: string) {
    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new InvalidPlanningStateError('Planning chat is only available for active workflows')
    }

    if (workflow.currentPhaseKey && workflow.currentPhaseKey !== 'planning') {
      throw new InvalidPlanningStateError('Planning chat is only available while the Planning phase is current')
    }

    return workflow
  }

  private async loadLinkedRepositories(organizationId: string, projectId: string, workflowId: string) {
    const links = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
    const allRepos = await this.gitRepositoryService.findAllByProject(organizationId, projectId)
    const linkedIds = new Set(links.map((l: WorkflowRepositoryEntity) => l.repositoryId))

    return allRepos
      .filter((repo) => linkedIds.has(repo.id))
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
      }))
  }

  private formatUserMessage(userMessage: string, codeSnippets: PlanningChatInput['codeSnippets']): string {
    const parts: string[] = [userMessage.trim()]

    if (codeSnippets?.length) {
      parts.push('\n\n--- Attached snippets ---')
      for (const snippet of codeSnippets) {
        const title = snippet.path ?? snippet.label ?? 'snippet'
        parts.push(`\n### ${title}\n\`\`\`\n${snippet.content}\n\`\`\``)
      }
    }

    return parts.join('')
  }

  private async buildPlanningSystemPrompt(
    workflow: NonNullable<Awaited<ReturnType<IWorkflowRepository['findById']>>>,
    organizationId: string,
    projectId: string
  ): Promise<string> {
    const repositories = await this.loadLinkedRepositories(organizationId, projectId, workflow.id)
    const classification = workflow.classification as { reasoning?: string } | null

    const brainstormSessions = await this.conversationService.getWorkflowSessions(workflow.id)
    const brainstorm = brainstormSessions
      .filter((s) => s.phase === ConversationPhase.BRAINSTORMING)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]

    let brainstormExcerpt = ''
    if (brainstorm) {
      const msgs = await this.conversationService.getMessages(brainstorm.id)
      brainstormExcerpt = msgs
        .filter((m) => m.role === MessageRole.USER || m.role === MessageRole.ASSISTANT)
        .slice(-6)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n')
    }

    const repoLines =
      repositories.length > 0
        ? repositories.map((r) => `- ${r.name} (${r.url}) branch ${r.branch}`).join('\n')
        : '- (no linked repositories)'

    return `You are a senior software architect pair-programming during the **Planning** phase of a STORY workflow.

Your job is technical planning grounded in the actual codebase when files are provided:
- Propose architecture, schema changes, API contracts, and module boundaries
- Reference existing patterns in attached repo files or snippets (do not invent file paths that were not provided)
- Break work into implementable steps for the Implementation phase
- Call out risks, migrations, tests, and rollout notes
- Ask one focused technical question when critical information is missing

Workflow title: ${workflow.title}
${workflow.description ? `Description: ${workflow.description}` : ''}

Linked repositories:
${repoLines}

Requirements summary:
${classification?.reasoning ?? '(no classification summary stored)'}

Recent brainstorm excerpt:
${brainstormExcerpt || '(none)'}

Respond in clear markdown. Prefer concrete recommendations over generic advice.`
  }

  private toAIMessages(messages: ConversationMessage[]): Message[] {
    return messages
      .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
  }

  async generatePRDArtifact(workflowId: string, sessionId: string, phaseId: string): Promise<ArtifactEntity> {
    // Get conversation history
    const messages = await this.conversationService.getMessages(sessionId)

    // Concatenate all assistant messages (where artifacts would be)
    const assistantMessages = messages
      .filter((msg) => msg.role === MessageRole.ASSISTANT)
      .map((msg) => msg.content)
      .join('\n\n')

    // Parse artifact tags from conversation
    const parsedArtifacts = this.artifactService.parseArtifactTags(assistantMessages)

    // Find PRD artifact
    const prdArtifact = parsedArtifacts.find((artifact) => artifact.type === 'prd')

    if (!prdArtifact) {
      throw new InvalidPlanningStateError(
        'No PRD artifact found in conversation. The AI must generate a PRD using <artifact type="prd"> tags.'
      )
    }

    // Upload artifact to storage
    const artifact = await this.artifactService.uploadArtifact(
      workflowId,
      'prd',
      prdArtifact.key,
      prdArtifact.title,
      prdArtifact.content,
      {
        phaseId,
        fileName: `${prdArtifact.key}.md`,
        mimeType: 'text/markdown',
      }
    )

    return artifact
  }
}
