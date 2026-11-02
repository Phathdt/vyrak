import { Controller, Inject, Param, Post, Body, Sse, UseGuards, MessageEvent } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { IAIAgentPort, AI_AGENT_API_PORT } from '@vyrak/ai-agent'
import { IConversationService, CONVERSATION_SERVICE, ConversationPhase, MessageRole } from '@vyrak/conversation'
import { IGitRepositoryService, GIT_REPOSITORY_SERVICE } from '@vyrak/project'
import {
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
} from '@vyrak/workflow-core'
import { PlanningChatRequestDto } from '@vyrak/workflow-planning'
import { Observable } from 'rxjs'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'

interface ChatStreamData {
  type: 'user_message' | 'assistant_delta' | 'assistant_complete' | 'error'
  content?: string
  messageId?: string
  error?: string
}

@ApiTags('Workflows - Planning SSE')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowPlanningSSEController {
  constructor(
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    @Inject(AI_AGENT_API_PORT) private readonly aiAgentPort: IAIAgentPort,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepository: IWorkflowRepository,
    @Inject(WORKFLOW_REPOSITORY_REPOSITORY)
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    @Inject(GIT_REPOSITORY_SERVICE) private readonly gitRepositoryService: IGitRepositoryService
  ) {}

  @Post('planning/chat-stream')
  @ApiOperation({
    summary: 'Stream planning chat with SSE (Server-Sent Events)',
    description: 'Real-time streaming chat for Planning phase. Returns SSE stream with deltas.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @Sse()
  async planningChatStream(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') workflowId: string,
    @Body() body: PlanningChatRequestDto
  ): Promise<Observable<MessageEvent>> {
    return new Observable((observer) => {
      ;(async () => {
        try {
          // 1. Get or create session
          const session = await this.conversationService.getOrCreateSession(workflowId, ConversationPhase.PLANNING)

          // 2. Format user message
          const userContent = this.formatUserMessage(body.userMessage, body.codeSnippets)

          // 3. Save user message
          const userMessage = await this.conversationService.addMessage({
            sessionId: session.id,
            role: MessageRole.USER,
            content: userContent,
          })

          // 4. Send user message confirmation
          observer.next({
            data: JSON.stringify({
              type: 'user_message',
              messageId: userMessage.id,
              content: userMessage.content,
            } as ChatStreamData),
          } as MessageEvent)

          // 5. Get conversation history
          const messages = await this.conversationService.getMessages(session.id)
          const aiMessages = messages
            .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
            .map((msg) => ({
              role: msg.role,
              content: msg.content,
            }))

          // 6. Build system prompt
          const workflow = await this.workflowRepository.findById(workflowId)
          if (!workflow) {
            throw new Error('Workflow not found')
          }

          const systemPrompt = await this.buildPlanningSystemPrompt(workflow, orgId, projectId)

          // 7. Stream AI response
          let fullResponse = ''
          const streamGenerator = this.aiAgentPort.chatStream({
            messages: aiMessages,
            systemPrompt,
            temperature: 0.3,
            maxTokens: 4096,
          })

          for await (const chunk of streamGenerator) {
            fullResponse += chunk
            observer.next({
              data: JSON.stringify({
                type: 'assistant_delta',
                content: chunk,
              } as ChatStreamData),
            } as MessageEvent)
          }

          // 8. Save complete AI message
          const aiMessage = await this.conversationService.addMessage({
            sessionId: session.id,
            role: MessageRole.ASSISTANT,
            content: fullResponse,
          })

          // 9. Send completion event
          observer.next({
            data: JSON.stringify({
              type: 'assistant_complete',
              messageId: aiMessage.id,
              content: fullResponse,
            } as ChatStreamData),
          } as MessageEvent)

          observer.complete()
        } catch (error) {
          observer.next({
            data: JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            } as ChatStreamData),
          } as MessageEvent)
          observer.error(error)
        }
      })()
    })
  }

  private formatUserMessage(userMessage: string, codeSnippets?: PlanningChatRequestDto['codeSnippets']): string {
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

    const { buildPlanningPrompt } = await import('@vyrak/workflow-planning')

    return buildPlanningPrompt({
      workflowTitle: workflow.title,
      workflowDescription: workflow.description || undefined,
      workflowType: classification?.type || 'STORY',
      repositories,
      brainstormExcerpt: brainstormExcerpt || undefined,
    })
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
}
