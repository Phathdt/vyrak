import { Inject, Injectable } from '@nestjs/common'
import { IConversationService, CONVERSATION_SERVICE, MessageRole } from '@vyrak/conversation'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { IEventBus, EVENT_BUS, EventType } from '@vyrak/event-bus'
import { IWorkflowRepository, WORKFLOW_REPOSITORY, RepositoryContextService } from '@vyrak/workflow-core'
import { randomUUID } from 'node:crypto'

type ChatEvent =
  | { type: 'thinking'; content: string }
  | { type: 'delta'; content: string }
  | { type: 'tool'; name: string; input: unknown }
  | { type: 'complete'; content: string; messageId: string }
  | { type: 'error'; message: string }

interface StreamChatParams {
  workflowId: string
  sessionId: string
  userId: string
  message: string
  orgId: string
  projectId: string
  model: string
  phase: string // Current workflow phase (planning, technical-refinement, etc)
}

/**
 * Chat business logic service
 * Extracted from SSE controller for reuse in WebSocket gateway
 */
@Injectable()
export class ChatService {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepository: IWorkflowRepository,
    private readonly repositoryContextService: RepositoryContextService,
    private readonly logger: EnhancedLogger
  ) {}

  /**
   * Stream chat with Agent SDK and publish events to Event Bus
   */
  async *streamChat(params: StreamChatParams): AsyncGenerator<ChatEvent> {
    const { workflowId, sessionId, message, orgId, projectId, model, phase } = params

    try {
      // Get repository path
      const repoPath = await this.repositoryContextService.resolveRepositoryPath(workflowId)

      if (!repoPath) {
        yield { type: 'error', message: 'No repository linked' }
        return
      }

      // Get workflow for system prompt
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        yield { type: 'error', message: 'Workflow not found' }
        return
      }

      // Get conversation history
      const messages = await this.conversationService.getMessages(sessionId)
      const conversationContext = messages
        .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      // Build system prompt based on phase
      const systemPrompt = this.buildSystemPrompt(workflow, phase)

      // Build prompt with history
      const promptWithHistory = `${systemPrompt}

Previous conversation:
${conversationContext}

User's latest message: ${message}

You have access to the project repository for scouting existing patterns. Use Read, Glob, and Grep tools to:
- Analyze existing code patterns and architecture
- Identify reusable components and similar implementations
- Understand current module structure
- Make informed architectural decisions based on actual code
- Reference real file paths in your ADRs and Implementation Plan
`

      // Stream with Agent SDK
      const { query } = await import('@anthropic-ai/claude-agent-sdk')
      const pendingFileChanges: Array<{ path: string; toolName: string }> = []

      this.logger.log(`[ChatService] Starting Agent SDK query`, 'ChatService')

      let fullResponse = ''
      const messageId = randomUUID()

      for await (const agentMessage of query({
        prompt: promptWithHistory,
        options: {
          model,
          allowedTools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
          maxTurns: 20,
          cwd: repoPath,
        },
      })) {
        this.logger.log(`[ChatService] Message type: ${agentMessage.type}`, 'ChatService')

        // Check assistant messages for content blocks
        if (agentMessage.type === 'assistant' && 'message' in agentMessage) {
          const assistantMsg = (agentMessage as Record<string, unknown>).message as Record<string, unknown>

          if (Array.isArray(assistantMsg?.content)) {
            for (const block of assistantMsg.content) {
              // Thinking
              if (block.type === 'thinking' && block.thinking) {
                yield { type: 'thinking', content: '🤔 Thinking...' }
              }

              // Text delta
              if (block.type === 'text' && block.text) {
                fullResponse += block.text

                await this.publishEvent(EventType.AGENT_MESSAGE_DELTA, {
                  type: EventType.AGENT_MESSAGE_DELTA,
                  workflowId,
                  sessionId,
                  content: block.text,
                  timestamp: Date.now(),
                })

                yield { type: 'delta', content: block.text }
              }

              // Tool use
              if (block.type === 'tool_use') {
                const toolName = block.name
                const toolInput = block.input

                // Publish tool use event for Write/Edit
                if ((toolName === 'Write' || toolName === 'Edit') && toolInput) {
                  const filePath =
                    (toolInput as Record<string, unknown>).file_path || (toolInput as Record<string, unknown>).path

                  if (typeof filePath === 'string') {
                    await this.publishEvent(EventType.AGENT_TOOL_USE, {
                      type: EventType.AGENT_TOOL_USE,
                      workflowId,
                      toolName: toolName as 'Write' | 'Edit',
                      toolInput: toolInput as { file_path?: string; content?: string; pattern?: string },
                      metadata: {
                        repoPath,
                        orgId,
                        projectId,
                      },
                      timestamp: Date.now(),
                    })

                    pendingFileChanges.push({ path: filePath, toolName })
                  }
                }

                yield { type: 'tool', name: toolName, input: toolInput }
              }
            }
          }
        }

        // Result - tool execution completed
        if (agentMessage.type === 'result' && !agentMessage.is_error) {
          // Process pending file changes (workers will handle artifact creation)
          pendingFileChanges.length = 0
        }
      }

      this.logger.log(`[ChatService] Agent SDK query completed. Response length: ${fullResponse.length}`, 'ChatService')

      // Emit complete event after loop finishes
      if (fullResponse) {
        yield { type: 'complete', content: fullResponse, messageId }
        this.logger.log(`[ChatService] Emitted complete event with messageId: ${messageId}`, 'ChatService')
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Chat stream error', 'ChatService')
      yield { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Check if user has access to workflow
   *
   * SECURITY: Validates that user has access to the workflow through organization membership
   */
  async checkWorkflowAccess(workflowId: string, userId: string): Promise<boolean> {
    try {
      const workflow = await this.workflowRepository.findById(workflowId)

      if (!workflow) {
        this.logger.warn(`Workflow not found: ${workflowId}`, 'ChatService')
        return false
      }

      // Check if user is the creator or assignee
      // TODO: Implement proper RBAC check with organization membership
      // For now, we check basic workflow ownership
      // In production, this should verify:
      // 1. User is member of the organization (workflow.organizationId)
      // 2. User has permission to access the project (workflow.projectId)
      // 3. User has appropriate role/permissions for the workflow

      // Temporary implementation: Allow access if workflow exists
      // This needs to be replaced with proper organization/project membership check
      this.logger.log(
        `Access check for user ${userId} on workflow ${workflowId}: ${workflow.organizationId}`,
        'ChatService'
      )

      return true // TODO: Replace with actual RBAC check
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Check access error', 'ChatService')
      return false
    }
  }

  /**
   * Publish event to Event Bus with error handling
   */
  private async publishEvent(eventType: string, data: unknown): Promise<void> {
    try {
      await this.eventBus.publish(eventType, data)
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to publish ${eventType}`)
      // Don't throw - continue chat flow even if event publishing fails
    }
  }

  /**
   * Build system prompt based on workflow phase
   */
  private buildSystemPrompt(workflow: { title: string; description?: string | null }, phase: string): string {
    switch (phase) {
      case 'planning':
        return this.buildPlanningSystemPrompt(workflow)
      case 'technical-refinement':
        return this.buildTechRefinementSystemPrompt(workflow)
      default:
        // Default to planning for unknown phases
        return this.buildPlanningSystemPrompt(workflow)
    }
  }

  /**
   * Build system prompt for planning phase (PDM)
   */
  private buildPlanningSystemPrompt(workflow: { title: string; description?: string | null }): string {
    return `You are a Product Discovery Manager (PDM) helping to refine product requirements and create a comprehensive Product Requirements Document (PRD).

## Current Task
Title: ${workflow.title}
Description: ${workflow.description || 'No description provided'}

## Your Role
You help product teams clarify requirements through:
1. **Requirement Discovery**: Ask clarifying questions to uncover user needs, business goals, and constraints
2. **User Story Refinement**: Help define clear user stories with acceptance criteria
3. **PRD Creation**: Structure findings into a comprehensive PRD document
4. **Stakeholder Alignment**: Ensure all stakeholders have shared understanding

## Tools Available
- **Read**: Read existing files to understand project context
- **Glob**: Find files matching patterns
- **Grep**: Search for text patterns across files
- **Write**: Create PRD document files in the repository
- **Edit**: Update existing files

## Workflow
1. **Discovery Phase**: Ask clarifying questions to gather requirements
2. **Documentation Phase**: Once requirements are clear, create a PRD document using the Write tool

## Creating PRD Documents
When requirements are sufficiently clarified, create a PRD file:
- **Path**: \`docs/prd/prd-{feature-slug}.md\`
- **Format**: Use clear markdown structure with sections:
  - Overview (Purpose, Goals, Target Users)
  - Scope (In Scope, Out of Scope)
  - User Stories
  - Functional Requirements
  - Non-Functional Requirements
  - Acceptance Criteria
  - Dependencies
  - Risks & Mitigations
  - Success Metrics

## Approach
- Start by understanding the "why" behind the feature
- Ask about target users, use cases, and success metrics
- Clarify scope, priorities, and dependencies
- Help identify edge cases and potential challenges
- Guide toward actionable, testable requirements
- **When ready**: Use Write tool to create the PRD document in \`docs/prd/\`

## Output
Focus on collaborative discovery rather than jumping to solutions. Ask thoughtful questions to help the team articulate their vision clearly.

Keep responses concise and conversational. Use follow-up questions to dig deeper into requirements.

**IMPORTANT**: After gathering enough information, proactively create a PRD document using the Write tool. The file will be automatically saved as an artifact.`
  }

  /**
   * Build system prompt for tech refinement
   */
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
