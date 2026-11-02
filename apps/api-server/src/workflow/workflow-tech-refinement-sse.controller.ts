import { Body, Controller, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { IConversationService, CONVERSATION_SERVICE, ConversationPhase, MessageRole } from '@vyrak/conversation'
import { IConfigService, CONFIG_SERVICE } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import {
  IWorkflowRepository,
  WORKFLOW_REPOSITORY,
  WorkflowNotFoundError,
  InvalidPlanningStateError,
  RepositoryContextService,
} from '@vyrak/workflow-core'
import { TechnicalRefinementChatRequestDto } from '@vyrak/workflow-planning'
import { Request, Response } from 'express'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'

interface ChatStreamData {
  type: 'user_message' | 'assistant_delta' | 'assistant_complete' | 'error' | 'tool_use'
  content?: string
  messageId?: string
  error?: string
  tool?: {
    name: string
    input: unknown
  }
}

@ApiTags('Workflows - Tech Refinement SSE')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowTechRefinementSSEController {
  private readonly logger: EnhancedLogger
  private readonly model: string

  constructor(
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepository: IWorkflowRepository,
    @Inject(CONFIG_SERVICE) private readonly configService: IConfigService,
    private readonly repositoryContextService: RepositoryContextService,
    private readonly enhancedLogger: EnhancedLogger
  ) {
    this.logger = this.enhancedLogger
    const anthropicConfig = this.configService.anthropic
    if (!anthropicConfig?.model) {
      throw new Error('ANTHROPIC__MODEL not configured in .env')
    }
    this.model = anthropicConfig.model
  }

  @Post('tech-refinement/chat-stream')
  @ApiOperation({
    summary: 'Stream tech refinement chat with SSE (Server-Sent Events)',
    description:
      'Real-time streaming chat for Technical Refinement phase with code scouting tools. Returns SSE stream with deltas. Rate limited to 10 requests per minute.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async techRefinementChatStream(
    @Req() req: Request,
    @Res() res: Response,
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string,
    @Body() body: TechnicalRefinementChatRequestDto
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
      // 1. Validate workflow is in TECHNICAL_REFINEMENT phase
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        throw new WorkflowNotFoundError(workflowId)
      }

      if (workflow.currentPhaseKey !== 'technical-refinement') {
        throw new InvalidPlanningStateError(
          `Tech refinement chat is only available during TECHNICAL_REFINEMENT phase. Current phase: ${workflow.currentPhaseKey}`
        )
      }

      // 2. Get or create session
      const session = await this.conversationService.getOrCreateSession(
        workflowId,
        ConversationPhase.TECHNICAL_REFINEMENT
      )

      // 3. Format user message
      const userContent = this.formatUserMessage(body.userMessage, body.codeSnippets)

      // 4. Save user message
      const userMessage = await this.conversationService.addMessage({
        sessionId: session.id,
        role: MessageRole.USER,
        content: userContent,
      })

      // 5. Send user message confirmation
      sendSSE({
        type: 'user_message',
        messageId: userMessage.id,
        content: userMessage.content,
      })

      // 6. Get conversation history
      const messages = await this.conversationService.getMessages(session.id)
      const conversationContext = messages
        .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      // 7. Build system prompt with repository context
      const systemPrompt = this.buildTechRefinementSystemPrompt(workflow)

      // 8. Get repository path for Agent SDK
      const repoPath = await this.repositoryContextService.resolveRepositoryPath(workflowId)

      if (!repoPath) {
        sendError('No repository linked. Please link a repository to use code scouting features.')
        return
      }

      // 9. Build prompt with conversation history
      const promptWithHistory = `${systemPrompt}

Previous conversation:
${conversationContext}

User's latest message: ${body.userMessage}

You have access to the project repository for scouting existing patterns. Use Read, Glob, and Grep tools to:
- Analyze existing code patterns and architecture
- Identify reusable components and similar implementations
- Understand current module structure
- Make informed architectural decisions based on actual code
- Reference real file paths in your ADRs and Implementation Plan
`

      // 10. Stream with Agent SDK
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      let fullResponse = ''

      for await (const message of query({
        prompt: promptWithHistory,
        options: {
          model: this.model,
          allowedTools: ['Read', 'Glob', 'Grep'],
          maxTurns: 15,
          cwd: repoPath,
        },
      })) {
        // Stop streaming if client disconnected
        if (!streamActive || abortController.signal.aborted) {
          break
        }

        // Handle result message
        if (message.type === 'result' && message.subtype === 'success' && !message.is_error) {
          fullResponse = message.result
          // Send full response as delta
          sendSSE({
            type: 'assistant_delta',
            content: message.result,
          })
        } else if (message.type === 'result' && message.subtype !== 'success') {
          const errorMsg =
            'error_message' in message && typeof message.error_message === 'string'
              ? message.error_message
              : 'Agent execution failed'
          sendError(errorMsg)
          return
        }
      }

      // 11. Save complete AI message (only if stream completed)
      if (streamActive && !abortController.signal.aborted && fullResponse) {
        const aiMessage = await this.conversationService.addMessage({
          sessionId: session.id,
          role: MessageRole.ASSISTANT,
          content: fullResponse,
        })

        // 12. Send completion event
        sendSSE({
          type: 'assistant_complete',
          messageId: aiMessage.id,
          content: fullResponse,
        })
      }

      // 13. Close stream
      res.end()
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), undefined, 'SSE:Controller')

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      sendError(errorMessage)
    } finally {
      cleanup()
    }
  }

  private formatUserMessage(
    userMessage: string,
    codeSnippets?: Array<{ label?: string; path?: string; content: string }>
  ): string {
    if (!codeSnippets || codeSnippets.length === 0) {
      return userMessage
    }

    let formatted = userMessage + '\n\n'
    for (const snippet of codeSnippets) {
      const filePath = snippet.path || snippet.label || 'code'
      formatted += `\n\`\`\`${filePath}\n${snippet.content}\n\`\`\`\n`
    }

    return formatted
  }

  private buildTechRefinementSystemPrompt(workflow: { title: string; description?: string | null }): string {
    return `You are a Senior Software Architect assisting with technical refinement for a software project.

## Current Task
Title: ${workflow.title}
Description: ${workflow.description || 'No description provided'}

## Your Role
You help developers refine technical implementation details through:
1. **Code Scouting**: Analyze existing codebase structure, patterns, and dependencies
2. **Architectural Decisions**: Document technical choices in ADR (Architecture Decision Record) format
3. **Implementation Planning**: Create detailed, file-level implementation plans
4. **Technical Validation**: Verify proposed solutions against codebase constraints

## Tools Available
- **Read**: Read file contents (use for understanding specific implementations)
- **Glob**: Find files matching patterns (use for discovering similar files or components)
- **Grep**: Search for text patterns across files (use for finding usages, patterns, imports)

## Guidelines
- Scout the codebase BEFORE making architectural recommendations
- Reference specific files, classes, and functions when discussing solutions
- Consider existing patterns and conventions in the codebase
- Document trade-offs and alternatives in ADRs
- Provide actionable, concrete recommendations with real file paths
- Flag potential risks and edge cases
- Break down implementation into specific tasks with file locations

## Output Formats
When creating an ADR, use:
\`\`\`markdown
# ADR-XXX: [Decision Title]

## Status
Proposed / Accepted / Deprecated

## Context
What technical problem needs to be solved?

## Decision
What solution did we choose?

## Alternatives Considered
### Option 1: [Name]
**Pros:** ...
**Cons:** ...

## Consequences
**Positive:** ...
**Negative:** ...
**Neutral:** ...

## Implementation Notes
- Specific file paths
- Migration steps
- Rollback strategy
\`\`\`

When creating an implementation plan, include:
- Phase breakdown with clear milestones
- File-level task list (which files to create/modify)
- Dependencies between tasks
- Acceptance criteria per phase
- Rollback strategy

Respond concisely and technically. Focus on actionable guidance grounded in the actual codebase.`
  }
}
