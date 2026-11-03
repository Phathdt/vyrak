import { Body, Controller, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { IArtifactService, ARTIFACT_SERVICE } from '@vyrak/artifact'
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
    @Inject(ARTIFACT_SERVICE) private readonly artifactService: IArtifactService,
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

      // 10. Setup file change handler for auto-artifact creation
      const FileChangeEventHandler = (await import('@vyrak/workflow-planning')).FileChangeEventHandler
      const fileChangeHandler = new FileChangeEventHandler(this.artifactService, this.logger)

      // 11. Stream with Agent SDK
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      let fullResponse = ''
      const pendingFileChanges: Array<{ path: string; toolName: string }> = []

      this.logger.log(`[AgentSDK] Starting query`, 'TechRefinementSSE')

      for await (const message of query({
        prompt: promptWithHistory,
        options: {
          model: this.model,
          allowedTools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
          maxTurns: 20, // More turns for creating ADR/Plan files
          cwd: repoPath,
        },
      })) {
        this.logger.log(`[AgentSDK] Message type: ${message.type}`, 'TechRefinementSSE')

        // Check for tool uses and thinking in assistant messages
        if (message.type === 'assistant' && 'message' in message) {
          const assistantMsg = (message as Record<string, unknown>).message as Record<string, unknown>

          // Check each content block
          if (Array.isArray(assistantMsg?.content)) {
            for (const block of assistantMsg.content) {
              this.logger.log(`[AgentSDK] Block type: ${block.type}`, 'TechRefinementSSE')

              // Handle thinking blocks
              if (block.type === 'thinking' && block.thinking) {
                // Stream thinking to frontend as tool activity
                sendSSE({
                  type: 'tool_use',
                  content: '🤔 Thinking...',
                })
              }

              // Handle text blocks
              if (block.type === 'text' && block.text) {
                // Stream text (each block is independent complete text)
                sendSSE({
                  type: 'assistant_delta',
                  content: block.text,
                })
              }

              // Handle tool_use blocks
              if (block.type === 'tool_use') {
                const toolName = block.name
                const toolInput = block.input

                this.logger.log(
                  `[AgentSDK] tool_use - name: ${toolName}, hasInput: ${!!toolInput}`,
                  'TechRefinementSSE'
                )

                // Show tool activity in UI
                sendSSE({
                  type: 'tool_use',
                  content: `🔧 Using ${toolName}...`,
                  tool: {
                    name: toolName,
                    input: toolInput,
                  },
                })

                // Track Write/Edit for auto-artifact creation
                if ((toolName === 'Write' || toolName === 'Edit') && toolInput) {
                  const filePath =
                    (toolInput as Record<string, unknown>).file_path || (toolInput as Record<string, unknown>).path

                  this.logger.log(
                    `[FileChange] Tool: ${toolName}, FilePath: ${filePath}, Type: ${typeof filePath}`,
                    'TechRefinementSSE'
                  )

                  if (typeof filePath === 'string') {
                    // Store for processing after tool execution completes
                    pendingFileChanges.push({ path: filePath, toolName })
                    this.logger.log(`[FileChange] Queued for later: ${filePath}`, 'TechRefinementSSE')
                  }
                }
              }
            }
          }
        }

        // Handle result messages - tool execution completed
        if (message.type === 'result' && !message.is_error) {
          this.logger.log(`[AgentSDK] Result received, processing pending file changes`, 'TechRefinementSSE')

          // Process all pending file changes now that tool execution is complete
          for (const { path: filePath, toolName } of pendingFileChanges) {
            const event = {
              type: toolName === 'Write' ? ('file.created' as const) : ('file.updated' as const),
              path: filePath,
              toolName,
              timestamp: new Date().toISOString(),
            }

            this.logger.log(`[FileChange] Triggering handler for: ${filePath}`, 'TechRefinementSSE')

            // Handle file change asynchronously
            fileChangeHandler.handleFileChange(event, workflowId, repoPath).catch((error) => {
              this.logger.error(error instanceof Error ? error : new Error(String(error)), 'File change handler')
            })
          }

          // Clear pending changes
          pendingFileChanges.length = 0
        }

        // Stop streaming if client disconnected
        if (!streamActive || abortController.signal.aborted) {
          break
        }

        // Agent SDK only emits 'result' messages
        if (message.type === 'result') {
          if (message.subtype === 'success' && !message.is_error && 'result' in message) {
            fullResponse = message.result as string
            // Send complete response (Agent SDK doesn't stream text incrementally)
            sendSSE({
              type: 'assistant_delta',
              content: fullResponse,
            })
          } else if (message.subtype !== 'success' || message.is_error) {
            const errorMsg =
              'error_message' in message && typeof message.error_message === 'string'
                ? message.error_message
                : 'Agent execution failed'
            sendError(errorMsg)
            return
          }
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
- **Read**: Read file contents to understand specific implementations
- **Glob**: Find files matching patterns to discover similar files or components
- **Grep**: Search for text patterns across files to find usages, patterns, imports
- **Write**: Create new ADR or implementation plan files in the repository
- **Edit**: Update existing files when needed

## File Creation Guidelines
When creating ADRs or implementation plans, follow the project's conventions:

**For ADRs:**
- Path: \`docs/adr/adr-{number}-{decision-slug}.md\`
- Number sequentially starting from 001
- Include: Status, Context, Decision, Alternatives, Consequences, Implementation Notes

**For Implementation Plans:**
- Path: \`plans/{date}-{feature-slug}/README.md\`
- Date format: YYMMDD-HHMM (e.g., 261102-2330)
- Include: Overview, Phases, Dependencies, Acceptance Criteria, Rollback Strategy

## Workflow
1. Scout the codebase FIRST using Read, Glob, Grep
2. Analyze existing patterns and architecture
3. Create ADR file if architectural decision is needed
4. Create implementation plan file with specific phases and file paths
5. Reference real files, classes, and functions in your documentation
6. Provide concrete, actionable recommendations

## Guidelines
- Create files directly in the repository using Write tool
- Inform the user about created files with their full paths
- Scout the codebase BEFORE making architectural recommendations
- Reference specific files, classes, and functions when discussing solutions
- Consider existing patterns and conventions in the codebase
- Keep documentation concise, technical, and actionable

## Output
- Use Write tool to create ADR or plan files directly
- Report the full path of created files to the user
- Include specific file paths, line numbers when relevant
- Make documentation concrete and executable

Respond concisely and technically. Focus on creating concrete, executable artifacts in the repository.`
  }
}
