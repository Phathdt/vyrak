import { ArtifactEntity, IArtifactService } from '@vyrak/artifact'
import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import { InvalidPlanningStateError, WorkflowNotFoundError, WorkflowStatus } from '@vyrak/workflow-core'

import type { IWorkflowPlanningService } from '../../domain/interfaces/workflow-planning-service.interface'
import type { PlanningSessionResponseDto } from '../../domain/schemas/workflow-planning.schemas'
import type { IGitRepositoryService } from '@vyrak/project'
import type { IWorkflowRepository, IWorkflowRepositoryRepository, WorkflowRepositoryEntity } from '@vyrak/workflow-core'

export class WorkflowPlanningService implements IWorkflowPlanningService {
  constructor(
    private readonly conversationService: IConversationService,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryService: IGitRepositoryService,
    private readonly artifactService: IArtifactService
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
