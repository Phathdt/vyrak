import { Body, Controller, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { IAIAgentPort, AI_AGENT_API_PORT } from '@vyrak/ai-agent'
import { IConversationService, CONVERSATION_SERVICE, ConversationPhase, MessageRole } from '@vyrak/conversation'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { IGitRepositoryService, GIT_REPOSITORY_SERVICE } from '@vyrak/project'
import {
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WorkflowNotFoundError,
  InvalidPlanningStateError,
} from '@vyrak/workflow-core'
import { PlanningChatRequestDto, PlanningPromptBuilder } from '@vyrak/workflow-planning'
import { Request, Response } from 'express'

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
  private readonly logger: EnhancedLogger

  constructor(
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    @Inject(AI_AGENT_API_PORT) private readonly aiAgentPort: IAIAgentPort,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepository: IWorkflowRepository,
    @Inject(WORKFLOW_REPOSITORY_REPOSITORY)
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    @Inject(GIT_REPOSITORY_SERVICE) private readonly gitRepositoryService: IGitRepositoryService,
    private readonly enhancedLogger: EnhancedLogger
  ) {
    this.logger = this.enhancedLogger
  }

  @Post('planning/chat-stream')
  @ApiOperation({
    summary: 'Stream planning chat with SSE (Server-Sent Events)',
    description:
      'Real-time streaming chat for Planning phase. Returns SSE stream with deltas. Rate limited to 10 requests per minute.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async planningChatStream(
    @Req() req: Request,
    @Res() res: Response,
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') workflowId: string,
    @Body() body: PlanningChatRequestDto
  ): Promise<void> {
    // Set SSE headers BEFORE any async operations
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
    res.flushHeaders()

    let streamActive = true
    const abortController = new AbortController()

    // Cleanup function
    const cleanup = () => {
      streamActive = false
      abortController.abort()
    }

    // Listen for client disconnect
    req.on('close', cleanup)
    req.on('error', cleanup)

    // Helper to send SSE event
    const sendSSE = (data: ChatStreamData) => {
      if (!streamActive) return
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch (error) {
        this.logger.error(error instanceof Error ? error : new Error(String(error)), undefined, 'SSE:WriteStream')
        streamActive = false
      }
    }

    // Helper to send error and close
    const sendError = (error: string) => {
      if (!streamActive) return
      try {
        res.write(`event: error\nid: 1\ndata: ${error}\n\n`)
        res.end()
      } catch (e) {
        this.logger.error(e instanceof Error ? e : new Error(String(e)), undefined, 'SSE:SendError')
      }
      streamActive = false
    }

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
      sendSSE({
        type: 'user_message',
        messageId: userMessage.id,
        content: userMessage.content,
      })

      // 5. Get conversation history
      const messages = await this.conversationService.getMessages(session.id)
      const aiMessages = messages
        .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))

      // 6. Build system prompt
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        throw new WorkflowNotFoundError(workflowId)
      }

      // Validate workflow is in PLANNING phase
      if (workflow.currentPhaseKey !== 'planning') {
        throw new InvalidPlanningStateError(
          `Planning chat is only available during PLANNING phase. Current phase: ${workflow.currentPhaseKey}`
        )
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
        // Stop streaming if client disconnected
        if (!streamActive || abortController.signal.aborted) {
          break
        }

        fullResponse += chunk
        sendSSE({
          type: 'assistant_delta',
          content: chunk,
        })
      }

      // 8. Save complete AI message (only if stream completed)
      if (streamActive && !abortController.signal.aborted) {
        const aiMessage = await this.conversationService.addMessage({
          sessionId: session.id,
          role: MessageRole.ASSISTANT,
          content: fullResponse,
        })

        // 9. Send completion event
        sendSSE({
          type: 'assistant_complete',
          messageId: aiMessage.id,
          content: fullResponse,
        })

        // Close stream successfully
        res.end()
      }
    } catch (error) {
      // Log error for debugging
      this.logger.error(error instanceof Error ? error : new Error(String(error)), undefined, 'SSE:Controller')

      // Send error event and close
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      sendError(errorMessage)
    } finally {
      // Cleanup listeners
      req.off('close', cleanup)
      req.off('error', cleanup)
    }
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
    const promptBuilder = new PlanningPromptBuilder(
      this.conversationService,
      this.workflowRepositoryRepository,
      this.gitRepositoryService
    )

    return promptBuilder.build(workflow, organizationId, projectId)
  }
}
