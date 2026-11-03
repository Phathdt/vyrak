import { ConversationPhase, MessageRole } from '@vyrak/conversation'

import { buildPlanningPrompt } from '../../domain/prompts/planning-agent-prompt'

import type { IConversationService } from '@vyrak/conversation'
import type { IGitRepositoryService } from '@vyrak/project'
import type { IWorkflowRepository, IWorkflowRepositoryRepository, WorkflowRepositoryEntity } from '@vyrak/workflow-core'

/**
 * Utility class for building planning system prompts with workflow context
 */
export class PlanningPromptBuilder {
  constructor(
    private readonly conversationService: IConversationService,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryService: IGitRepositoryService
  ) {}

  /**
   * Build a complete planning system prompt with workflow context, brainstorm excerpt, and linked repositories
   */
  async build(
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

    return buildPlanningPrompt({
      workflowTitle: workflow.title,
      workflowDescription: workflow.description || undefined,
      workflowType: classification?.type || 'STORY',
      repositories,
      brainstormExcerpt: brainstormExcerpt || undefined,
    })
  }

  /**
   * Load linked repositories for a workflow
   */
  private async loadLinkedRepositories(
    organizationId: string,
    projectId: string,
    workflowId: string
  ): Promise<Array<{ name: string; url: string; branch: string }>> {
    const links = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
    const allRepos = await this.gitRepositoryService.findAllByProject(organizationId, projectId)
    const linkedIds = new Set(links.map((l: WorkflowRepositoryEntity) => l.repositoryId))

    return allRepos
      .filter((repo) => linkedIds.has(repo.id))
      .map((repo) => ({
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
      }))
  }
}
