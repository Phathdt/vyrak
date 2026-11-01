import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import { CustomConfigService } from '@vyrak/custom-config'

import { InvalidPlanningStateError, WorkflowNotFoundError, WorkflowStatus } from '../../domain'
import { buildDefaultRepoPaths, discoverRepoRoots, loadRepoFilesFromRoots } from '../../infras/planning/load-repo-files'

import type { IWorkflowRepository, IWorkflowRepositoryRepository } from '../../domain'
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
import type { IGitRepositoryService } from '@vyrak/project'

export class WorkflowPlanningService implements IWorkflowPlanningService {
  constructor(
    private readonly conversationService: IConversationService,
    private readonly aiAgentService: IAIAgentService,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryService: IGitRepositoryService,
    private readonly configService: CustomConfigService
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

    const repoFiles = await this.resolveRepoFiles(workflow.organizationId, workflow.projectId, input.repoPaths)
    const userContent = this.formatUserMessage(input.userMessage, input.codeSnippets, repoFiles)

    await this.conversationService.addMessage({
      sessionId: session.id,
      role: MessageRole.USER,
      content: userContent,
    })

    const messages = await this.conversationService.getMessages(session.id)
    const aiMessages = this.toAIMessages(messages)
    const systemPrompt = await this.buildPlanningSystemPrompt(workflow, input.organizationId, input.projectId)

    const aiResponse = await this.aiAgentService.chat({
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

    return {
      sessionId: session.id,
      aiMessage: aiResponse.content,
      messageCount,
      repoFilesLoaded: repoFiles.map((f) => ({ path: f.path, bytes: f.bytes })),
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
    const linkedIds = new Set(links.map((l) => l.repositoryId))

    return allRepos
      .filter((repo) => linkedIds.has(repo.id))
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
      }))
  }

  private async resolveRepoFiles(organizationId: string, projectId: string, repoPaths?: string[]) {
    const mainReposPath = this.configService.workspace?.mainReposPath
    if (!mainReposPath) {
      return []
    }

    const roots = await discoverRepoRoots([
      pathJoin(mainReposPath, organizationId, projectId),
      pathJoin(mainReposPath, projectId),
      mainReposPath,
    ])

    if (roots.length === 0) {
      return []
    }

    const paths = repoPaths?.length ? repoPaths : buildDefaultRepoPaths()
    return loadRepoFilesFromRoots(roots, paths)
  }

  private formatUserMessage(
    userMessage: string,
    codeSnippets: PlanningChatInput['codeSnippets'],
    repoFiles: Awaited<ReturnType<typeof loadRepoFilesFromRoots>>
  ): string {
    const parts: string[] = [userMessage.trim()]

    if (repoFiles.length > 0) {
      parts.push('\n\n--- Repository files (auto-loaded from local checkout) ---')
      for (const file of repoFiles) {
        parts.push(`\n### ${file.path}\n\`\`\`\n${file.content}\n\`\`\``)
      }
    }

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
}

function pathJoin(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/')
}
