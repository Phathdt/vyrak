import { MessageRole } from '@vyrak/conversation'
import { randomUUID } from 'node:crypto'

import type { IAgentStreamPort } from '@vyrak/ai-agent'
import type { IConversationService } from '@vyrak/conversation'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IWorkflowRepository, RepositoryContextService } from '@vyrak/workflow-core'

/**
 * Events of one chat turn. Same shapes the WebSocket clients already consume;
 * `tool` additionally carries the repository path so callers can publish file-change events.
 */
export type ChatTurnEvent =
  | { type: 'thinking'; content: string }
  | { type: 'delta'; content: string }
  | { type: 'tool'; name: string; input: unknown; repoPath: string }
  | { type: 'complete'; content: string; messageId: string }
  | { type: 'error'; message: string }

export interface ChatTurnParams {
  workflowId: string
  sessionId: string
  message: string
  /** Current workflow phase key (planning, technical-refinement, ...). Selects the system prompt. */
  phase: string
}

const AGENT_TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Edit']
const AGENT_MAX_TURNS = 20

/**
 * Runs one chat turn: resolves the repository, builds the prompt from the phase
 * system prompt plus conversation history, and relays the agent stream.
 * Plain class, wired through a factory in the consuming module.
 */
export class ChatTurnService {
  constructor(
    private readonly agentStream: IAgentStreamPort,
    private readonly conversationService: IConversationService,
    private readonly workflowRepository: IWorkflowRepository,
    private readonly repositoryContext: RepositoryContextService,
    private readonly logger: EnhancedLogger,
    private readonly generateId: () => string = randomUUID
  ) {}

  /**
   * Stream the agent answer for one chat turn. Failures are reported as a final
   * `error` event rather than thrown.
   */
  async *run(params: ChatTurnParams): AsyncGenerator<ChatTurnEvent> {
    const { workflowId, sessionId, message, phase } = params

    try {
      const repoPath = await this.repositoryContext.resolveRepositoryPath(workflowId)
      if (!repoPath) {
        yield { type: 'error', message: 'No repository linked' }
        return
      }

      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        yield { type: 'error', message: 'Workflow not found' }
        return
      }

      const messages = await this.conversationService.getMessages(sessionId)
      const conversationContext = messages
        .filter((msg) => msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n\n')

      const systemPrompt = this.buildSystemPrompt(workflow, phase)

      const prompt = `${systemPrompt}

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

      this.logger.log(`Starting agent stream for workflow ${workflowId}`, 'ChatTurnService')

      for await (const event of this.agentStream.stream({
        prompt,
        workingDirectory: repoPath,
        allowedTools: AGENT_TOOLS,
        maxTurns: AGENT_MAX_TURNS,
      })) {
        switch (event.type) {
          case 'thinking':
          case 'delta':
          case 'error':
            yield event
            break
          case 'tool':
            yield { type: 'tool', name: event.name, input: event.input, repoPath }
            break
          case 'complete':
            yield { type: 'complete', content: event.content, messageId: this.generateId() }
            break
        }
      }
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'Chat stream error',
        'ChatTurnService'
      )
      yield { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
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
