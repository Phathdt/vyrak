import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { TaskExecutionResult } from '../../domain/interfaces/orchestration-engine.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { SubTaskEntity } from '@vyrak/workflow-core'

export interface ImplementationContext {
  workflow: {
    id: string
    title: string
    description: string | null
  }
  phase: {
    id: string
    key: string
  }
  task: SubTaskEntity
  artifacts: {
    prd?: string
    technicalSpecs?: string
    implementationPlan?: string
  }
  workspacePath: string
}

const IMPLEMENTATION_TASK_PROMPT = `You are implementing a specific sub-task in an existing codebase.

## Context

**Workflow:** {workflowTitle}
{workflowDescription}

**Task:** {taskTitle}
{taskDescription}

**Acceptance Criteria:**
{acceptanceCriteria}

## Available Context Artifacts

{artifactsContext}

## Instructions

1. Read the Implementation Plan artifact first to understand the overall approach
2. Focus ONLY on implementing THIS specific sub-task
3. Follow the existing codebase patterns and conventions
4. Write clean, maintainable code with proper error handling
5. Add tests for new functionality
6. Run relevant tests or typecheck to verify your changes
7. Do NOT implement other tasks - stay focused on your assignment

## Deliverables

When finished, provide a summary including:
- Files created/modified
- Key changes made
- Tests added/updated
- Any issues encountered
- Remaining work or follow-ups

Working directory: {workspacePath}
`

/**
 * Implementation Agent Runner
 * Executes a single sub-task using Claude Agent SDK with git worktree isolation
 */
export class ImplementationAgentRunner {
  constructor(private readonly aiAgentService: IAIAgentService) {}

  /**
   * Execute a single sub-task implementation
   * Uses git worktree for isolation, loads context from artifacts
   */
  async executeTask(context: ImplementationContext): Promise<TaskExecutionResult> {
    const startedAt = new Date()

    try {
      // Prepare prompt with task context
      const prompt = this.buildPrompt(context)

      // Write artifacts to workspace for easy reference
      await this.writeArtifactsToWorkspace(context)

      // Execute agent with tools enabled
      const response = await this.aiAgentService.runAgent({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        systemPrompt: this.buildSystemPrompt(context),
        workingDirectory: context.workspacePath,
        allowedTools: ['Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob'],
        maxTokens: 8192,
      })

      const completedAt = new Date()

      // Extract implementation report from response
      const reportContent = response.content

      return {
        taskId: context.task.id,
        status: 'completed',
        reportContent,
        startedAt,
        completedAt,
        usage: {
          inputTokens: response.usage?.inputTokens || 0,
          outputTokens: response.usage?.outputTokens || 0,
        },
      }
    } catch (error) {
      const completedAt = new Date()
      const err = error instanceof Error ? error : new Error(String(error))

      return {
        taskId: context.task.id,
        status: 'failed',
        error: err.message,
        startedAt,
        completedAt,
      }
    }
  }

  private buildPrompt(context: ImplementationContext): string {
    let prompt = IMPLEMENTATION_TASK_PROMPT.replace('{workflowTitle}', context.workflow.title)
      .replace('{workflowDescription}', context.workflow.description || 'No description provided')
      .replace('{taskTitle}', context.task.title)
      .replace('{taskDescription}', context.task.description || 'No description provided')
      .replace('{workspacePath}', context.workspacePath)

    // Format acceptance criteria
    const acceptanceCriteria = context.task.acceptanceCriteria
    if (acceptanceCriteria && typeof acceptanceCriteria === 'object') {
      const criteriaList = Object.entries(acceptanceCriteria)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n')
      prompt = prompt.replace('{acceptanceCriteria}', criteriaList || 'No specific criteria defined')
    } else {
      prompt = prompt.replace('{acceptanceCriteria}', 'No specific criteria defined')
    }

    // Build artifacts context
    let artifactsContext = ''
    if (context.artifacts.prd) {
      artifactsContext += `### PRD (Product Requirements Document)\nSee: .vyrak-artifacts/prd.md\n\n`
    }
    if (context.artifacts.technicalSpecs) {
      artifactsContext += `### Technical Specifications\nSee: .vyrak-artifacts/technical-specs.md\n\n`
    }
    if (context.artifacts.implementationPlan) {
      artifactsContext += `### Implementation Plan\nSee: .vyrak-artifacts/implementation-plan.md\n\n`
    }

    if (!artifactsContext) {
      artifactsContext = 'No artifacts available. Implement based on task description.'
    }

    prompt = prompt.replace('{artifactsContext}', artifactsContext)

    return prompt
  }

  private buildSystemPrompt(context: ImplementationContext): string {
    return [
      'You are Claude, an AI assistant specialized in software development.',
      'You have access to tools for reading, editing, and executing code.',
      '',
      `Working on sub-task: ${context.task.key} - ${context.task.title}`,
      `Working directory: ${context.workspacePath}`,
      '',
      'Follow the existing codebase patterns and conventions.',
      'Write clean, maintainable code with proper error handling.',
      'Add tests for new functionality when appropriate.',
      '',
      'IMPORTANT: Focus ONLY on implementing THIS specific sub-task.',
      'Do not implement other tasks or make unrelated changes.',
    ].join('\n')
  }

  private async writeArtifactsToWorkspace(context: ImplementationContext): Promise<void> {
    const artifactsDir = path.join(context.workspacePath, '.vyrak-artifacts')

    // Write PRD if available
    if (context.artifacts.prd) {
      const prdPath = path.join(artifactsDir, 'prd.md')
      await writeFile(prdPath, context.artifacts.prd, 'utf8').catch(() => {
        // Ignore write errors for artifacts
      })
    }

    // Write technical specs if available
    if (context.artifacts.technicalSpecs) {
      const specsPath = path.join(artifactsDir, 'technical-specs.md')
      await writeFile(specsPath, context.artifacts.technicalSpecs, 'utf8').catch(() => {
        // Ignore write errors
      })
    }

    // Write implementation plan if available
    if (context.artifacts.implementationPlan) {
      const planPath = path.join(artifactsDir, 'implementation-plan.md')
      await writeFile(planPath, context.artifacts.implementationPlan, 'utf8').catch(() => {
        // Ignore write errors
      })
    }
  }
}
