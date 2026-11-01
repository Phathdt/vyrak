import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IConfigService } from '@vyrak/custom-config'

const IMPLEMENTATION_SYSTEM_APPEND = `You are implementing a change in an existing codebase (Vyrak monorepo conventions when applicable).
Follow the planning document. Make minimal, correct diffs. Run relevant tests or typecheck when reasonable.
When finished, summarize what you changed and any follow-ups.`

const REVIEW_SYSTEM_APPEND =
  'You are a senior reviewer. READ-ONLY review: do not edit, commit, or push. Be specific with file paths.'

export type ClaudeCodeRunResult = {
  content: string
  stopReason: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  usedFakeAgent: boolean
}

export class ClaudeCodeRunner {
  constructor(
    private readonly configService: IConfigService,
    private readonly aiAgentService: IAIAgentService
  ) {}

  async runImplementation(params: {
    workspacePath: string
    planText: string
    workflowId: string
  }): Promise<ClaudeCodeRunResult> {
    const planPath = path.join(params.workspacePath, '.vyrak-plan.md')
    await writeFile(planPath, params.planText, 'utf8')

    return this.runPrompt({
      workspacePath: params.workspacePath,
      workflowId: params.workflowId,
      userPrompt: `Implement the work described in ${planPath}. Read that file first, then apply the plan in this repository.`,
      systemAppend: IMPLEMENTATION_SYSTEM_APPEND,
      allowTools: ['Read', 'Edit', 'Write', 'Bash', 'Grep'],
    })
  }

  async runReview(params: { workspacePath: string; workflowId: string; branch: string }): Promise<ClaudeCodeRunResult> {
    return this.runPrompt({
      workspacePath: params.workspacePath,
      workflowId: params.workflowId,
      userPrompt: `Review the code changes on branch ${params.branch} in this worktree compared to the base branch. List findings in markdown with severity (blocker/major/minor). Do not modify files.`,
      systemAppend: REVIEW_SYSTEM_APPEND,
      allowTools: ['Read', 'Bash', 'Grep'], // Read-only for review
    })
  }

  private async runPrompt(params: {
    workspacePath: string
    workflowId: string
    userPrompt: string
    systemAppend: string
    allowTools: string[]
  }): Promise<ClaudeCodeRunResult> {
    const agentRuntime = this.configService.agentRuntime
    const useFake = agentRuntime?.useFakeAgent === true

    if (useFake) {
      const marker = path.join(params.workspacePath, '.vyrak-fake-agent.txt')
      await writeFile(marker, `Fake agent run for workflow ${params.workflowId}\n`, 'utf8')
      return {
        content:
          'Fake agent: wrote .vyrak-fake-agent.txt (set AGENT_RUNTIME__USE_FAKE_AGENT=false for real Agent SDK).',
        stopReason: 'end_turn',
        usage: { inputTokens: 0, outputTokens: 0 },
        usedFakeAgent: true,
      }
    }

    const systemPrompt = [
      'You are Claude, an AI assistant with access to tools for reading, editing, and executing code.',
      params.systemAppend,
      `Working directory: ${params.workspacePath}`,
    ].join('\n\n')

    // Use Agent SDK with real tools
    const response = await this.aiAgentService.chat({
      messages: [
        {
          role: 'user',
          content: params.userPrompt,
        },
      ],
      systemPrompt,
      workingDirectory: params.workspacePath,
      allowedTools: params.allowTools,
      maxTokens: 8192,
    })

    return {
      content: response.content,
      stopReason: response.finishReason || 'end_turn',
      usage: {
        inputTokens: response.usage?.inputTokens || 0,
        outputTokens: response.usage?.outputTokens || 0,
      },
      usedFakeAgent: false,
    }
  }
}
