import { ArtifactEntity, IArtifactService } from '@vyrak/artifact'
import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import {
  InvalidPlanningStateError,
  WorkflowNotFoundError,
  WorkflowStatus,
  IWorkflowPhaseRepository,
} from '@vyrak/workflow-core'

import type {
  IWorkflowPlanningService,
  PlanningChatInput,
} from '../../domain/interfaces/workflow-planning-service.interface'
import type {
  PlanningChatResponseDto,
  PlanningSessionResponseDto,
} from '../../domain/schemas/workflow-planning.schemas'
import type { IAIAgentPort, Message } from '@vyrak/ai-agent'
import type { ConversationMessage } from '@vyrak/conversation'
import type { IGitRepositoryService } from '@vyrak/project'
import type { IWorkflowRepository, IWorkflowRepositoryRepository, WorkflowRepositoryEntity } from '@vyrak/workflow-core'

export class WorkflowPlanningService implements IWorkflowPlanningService {
  constructor(
    private readonly conversationService: IConversationService,
    private readonly aiAgentPort: IAIAgentPort,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryService: IGitRepositoryService,
    private readonly artifactService: IArtifactService,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository
  ) {}

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

    // Use API SDK (no tools) to prevent technical contamination
    const aiResponse = await this.aiAgentPort.chat({
      messages: aiMessages,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 4096,
    })

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.ASSISTANT,
      content: aiResponse.content,
    })

    const messageCount = await this.conversationService.getMessageCount(session.id)

    // Auto-detect and save artifact if present in NEW response only
    let artifactCreated = false
    let artifactId: string | undefined

    // Check if artifact already exists in database
    const existingArtifacts = await this.artifactService.listWorkflowArtifacts(input.workflowId)
    const hasPRDArtifact = existingArtifacts.some((a: ArtifactEntity) => a.type === 'prd')

    if (!hasPRDArtifact && this.containsArtifactTag(aiResponse.content)) {
      try {
        const phases = await this.workflowPhaseRepository.findByWorkflowId(input.workflowId)
        const planningPhase = phases.find((p) => p.key === 'planning')

        if (planningPhase) {
          const artifact = await this.generatePRDArtifact(input.workflowId, session.id, planningPhase.id)
          artifactCreated = true
          artifactId = artifact.id
        }
      } catch (error) {
        // Log error but don't fail the chat response
        console.error('Failed to auto-create artifact:', error)
      }
    }

    return {
      sessionId: session.id,
      aiMessage: aiResponse.content,
      messageCount,
      repoFilesLoaded: [],
      artifactCreated,
      artifactId,
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
    const classification = workflow.classification as { reasoning?: string; type?: string } | null

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

    const { buildPlanningPrompt } = await import('../../domain/prompts/planning-agent-prompt')

    return buildPlanningPrompt({
      workflowTitle: workflow.title,
      workflowDescription: workflow.description || undefined,
      workflowType: classification?.type || 'STORY',
      repositories,
      brainstormExcerpt: brainstormExcerpt || undefined,
    })
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

  /**
   * Check if response contains artifact tag
   */
  private containsArtifactTag(text: string): boolean {
    return text.includes('<artifact') && text.includes('</artifact>')
  }

  async generatePRDArtifactFromMessage(
    workflowId: string,
    messageId: string,
    phaseId: string
  ): Promise<ArtifactEntity> {
    // Get the specific message
    const message = await this.conversationService.getMessageById(messageId)

    if (!message) {
      throw new InvalidPlanningStateError(`Message not found: ${messageId}`)
    }

    if (message.role !== MessageRole.ASSISTANT) {
      throw new InvalidPlanningStateError('Only assistant messages can be used to create PRD artifacts')
    }

    // Try to parse artifact tags from the message content
    const parsedArtifacts = this.artifactService.parseArtifactTags(message.content)
    const prdArtifact = parsedArtifacts.find((artifact) => artifact.type === 'prd')

    let title: string
    let content: string
    let key: string

    if (prdArtifact) {
      // Use parsed artifact if available
      title = prdArtifact.title
      content = prdArtifact.content
      key = prdArtifact.key
    } else {
      // Use entire message content as PRD
      title = 'Product Requirements Document'
      content = message.content
      key = 'prd'
    }

    // Upload artifact to storage
    const artifact = await this.artifactService.uploadArtifact(workflowId, 'prd', key, title, content, {
      phaseId,
      fileName: `${key}.md`,
      mimeType: 'text/markdown',
    })

    return artifact
  }
}
