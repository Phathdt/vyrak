import Anthropic from '@anthropic-ai/sdk'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { CustomConfigService } from '@vyrak/custom-config'

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
  private anthropicClient: Anthropic | null = null

  constructor(private readonly configService: CustomConfigService) {
    this.initializeClient()
  }

  private initializeClient(): void {
    const anthropicConfig = this.configService.anthropic
    if (!anthropicConfig?.apiKey) {
      return
    }

    this.anthropicClient = new Anthropic({
      apiKey: anthropicConfig.apiKey,
      baseURL: anthropicConfig.apiUrl ? this.normalizeBaseUrl(anthropicConfig.apiUrl) : undefined,
    })
  }

  private normalizeBaseUrl(url: string): string {
    const base = url.replace(/\/$/, '')
    return base.endsWith('/v1') ? base : `${base}/v1`
  }

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
    })
  }

  async runReview(params: { workspacePath: string; workflowId: string; branch: string }): Promise<ClaudeCodeRunResult> {
    return this.runPrompt({
      workspacePath: params.workspacePath,
      workflowId: params.workflowId,
      userPrompt: `Review the code changes on branch ${params.branch} in this worktree compared to the base branch. List findings in markdown with severity (blocker/major/minor). Do not modify files.`,
      systemAppend: REVIEW_SYSTEM_APPEND,
    })
  }

  private async runPrompt(params: {
    workspacePath: string
    workflowId: string
    userPrompt: string
    systemAppend: string
  }): Promise<ClaudeCodeRunResult> {
    const agentRuntime = this.configService.agentRuntime
    const useFake = agentRuntime?.useFakeAgent === true

    if (useFake) {
      const marker = path.join(params.workspacePath, '.vyrak-fake-agent.txt')
      await writeFile(marker, `Fake agent run for workflow ${params.workflowId}\n`, 'utf8')
      return {
        content: 'Fake agent: wrote .vyrak-fake-agent.txt (set AGENT_RUNTIME__USE_FAKE_AGENT=false for real SDK).',
        stopReason: 'end_turn',
        usage: { inputTokens: 0, outputTokens: 0 },
        usedFakeAgent: true,
      }
    }

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized. Check ANTHROPIC__API_KEY configuration.')
    }

    const model = this.configService.anthropic?.model || 'claude-sonnet-4-20250514'

    const systemPrompt = [
      'You are Claude, an AI assistant with access to tools for reading, editing, and executing code.',
      params.systemAppend,
      `Working directory: ${params.workspacePath}`,
    ].join('\n\n')

    const response = await this.anthropicClient.messages.create({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: params.userPrompt,
        },
      ],
    })

    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')

    return {
      content: textContent,
      stopReason: response.stop_reason || 'end_turn',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      usedFakeAgent: false,
    }
  }
}
