import { query } from '@anthropic-ai/claude-agent-sdk'

import type {
  AgentRequest,
  AgentResponse,
  AgentStreamRequest,
  ChatEvent,
  IAgentStreamPort,
  IAIAgentPort,
  WorkflowClassification,
} from '@vyrak/ai-agent'
import type { IConfigService } from '@vyrak/custom-config'

type StreamEventMessage = {
  type: 'stream_event'
  delta?: {
    type: 'text_delta'
    text: string
  }
}

type ResultMessage = {
  type: 'result'
  subtype: 'success'
  is_error: boolean
  result: string
}

type AgentMessage = StreamEventMessage | ResultMessage | { type: string }

type AssistantBlock = {
  type?: string
  thinking?: string
  text?: string
  name?: string
  input?: unknown
}

const THINKING_PLACEHOLDER = '🤔 Thinking...'
const DEFAULT_STREAM_MAX_TURNS = 20

/**
 * Claude Agent SDK Adapter
 *
 * Uses the official @anthropic-ai/claude-agent-sdk with native tool support.
 * Spawns claude CLI subprocess with access to local filesystem via cwd.
 */
export class ClaudeAgentSdkAdapter implements IAIAgentPort, IAgentStreamPort {
  private model: string
  private readonly env: Record<string, string | undefined>

  constructor(private readonly configService: IConfigService) {
    const anthropic = this.configService.anthropic
    if (!anthropic?.apiKey || !anthropic.model) {
      throw new Error(
        'Anthropic config is missing. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'
      )
    }

    this.model = anthropic.model
    // The claude subprocess reads its credentials from the environment, not from our config.
    this.env = {
      ...process.env,
      ...(anthropic.authScheme === 'bearer'
        ? { ANTHROPIC_AUTH_TOKEN: anthropic.apiKey, ANTHROPIC_API_KEY: undefined }
        : { ANTHROPIC_API_KEY: anthropic.apiKey }),
      ...(anthropic.apiUrl ? { ANTHROPIC_BASE_URL: anthropic.apiUrl } : {}),
    }
  }

  async chat(request: AgentRequest): Promise<AgentResponse> {
    const userMessage = request.messages[request.messages.length - 1]?.content || ''

    let fullResult = ''
    let inputTokens = 0
    let outputTokens = 0

    for await (const message of query({
      prompt: this.buildPrompt(request, userMessage),
      options: {
        model: this.model,
        env: this.env,
        cwd: request.workingDirectory,
        allowedTools: request.allowedTools || [],
        maxTurns: request.maxTurns || 8, // Default 8, can be overridden per request
        systemPrompt: request.systemPrompt
          ? {
              type: 'custom',
              prompt: request.systemPrompt,
            }
          : undefined,
      },
    })) {
      const msg = message as AgentMessage

      // Collect final result
      if (msg.type === 'result' && 'subtype' in msg && msg.subtype === 'success' && !msg.is_error) {
        fullResult = msg.result
      }

      // Collect text chunks for result
      if (msg.type === 'stream_event' && 'delta' in msg && msg.delta?.type === 'text_delta') {
        fullResult += msg.delta.text
      }

      // Note: Usage info may not be available until end
    }

    return {
      content: fullResult,
      finishReason: 'end_turn',
      usage: {
        inputTokens,
        outputTokens,
      },
    }
  }

  async *chatStream(request: AgentRequest): AsyncGenerator<string> {
    const userMessage = request.messages[request.messages.length - 1]?.content || ''

    for await (const message of query({
      prompt: this.buildPrompt(request, userMessage),
      options: {
        model: this.model,
        env: this.env,
        cwd: request.workingDirectory,
        allowedTools: request.allowedTools || [],
        maxTurns: request.maxTurns || 8, // Default 8, can be overridden per request
        systemPrompt: request.systemPrompt
          ? {
              type: 'custom',
              prompt: request.systemPrompt,
            }
          : undefined,
      },
    })) {
      const msg = message as AgentMessage

      // Stream text deltas
      if (msg.type === 'stream_event' && 'delta' in msg && msg.delta?.type === 'text_delta') {
        yield msg.delta.text
      }
    }
  }

  /**
   * Stream one chat turn as thinking/delta/tool events, followed by a single
   * `complete` event holding the accumulated text when the agent wrote any.
   * SDK failures propagate to the caller.
   */
  async *stream(request: AgentStreamRequest): AsyncGenerator<ChatEvent, void, unknown> {
    let fullResponse = ''

    for await (const message of query({
      prompt: request.prompt,
      options: {
        model: this.model,
        env: this.env,
        cwd: request.workingDirectory,
        allowedTools: request.allowedTools ?? [],
        maxTurns: request.maxTurns ?? DEFAULT_STREAM_MAX_TURNS,
      },
    })) {
      const content = (message as { type: string; message?: { content?: unknown } }).message?.content
      if (message.type !== 'assistant' || !Array.isArray(content)) {
        continue
      }

      for (const block of content as AssistantBlock[]) {
        if (block.type === 'thinking' && block.thinking) {
          yield { type: 'thinking', content: THINKING_PLACEHOLDER }
        }

        if (block.type === 'text' && block.text) {
          fullResponse += block.text
          yield { type: 'delta', content: block.text }
        }

        if (block.type === 'tool_use' && block.name) {
          yield { type: 'tool', name: block.name, input: block.input }
        }
      }
    }

    if (fullResponse) {
      yield { type: 'complete', content: fullResponse }
    }
  }

  async classifyWorkflow(request: AgentRequest): Promise<WorkflowClassification> {
    const classificationPrompt = `
You are an AI assistant helping to classify software development workflows.

Based on the conversation history, classify this workflow into one of three types:
- HOTFIX: Urgent bug fixes, small scope, single task
- STORY: Single feature, can be completed in one sprint, independent
- EPIC: Large feature requiring multiple stories, needs breakdown

Analyze the requirements discussed and provide:
1. Type (HOTFIX, STORY, or EPIC)
2. Confidence score (0.0 to 1.0)
3. Brief reasoning (2-3 sentences)
4. Scope (what will be changed)
5. Key assumptions
6. Potential risks

Return ONLY valid JSON:
{
  "type": "STORY",
  "confidence": 0.85,
  "reasoning": "This is a single feature...",
  "scope": "Frontend components and API endpoints",
  "assumptions": ["Backend API exists", "User authentication is in place"],
  "risks": ["May need database schema changes"]
}
`

    const conversationHistory = request.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n')
    const fullPrompt = `${classificationPrompt}\n\n--- Conversation History ---\n${conversationHistory}`

    let resultText = ''

    for await (const message of query({
      prompt: fullPrompt,
      options: {
        model: this.model,
        env: this.env,
        allowedTools: [],
        maxTurns: 1,
      },
    })) {
      const msg = message as AgentMessage

      if (msg.type === 'result' && 'subtype' in msg && msg.subtype === 'success' && !msg.is_error) {
        resultText = msg.result
      }
    }

    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        type: parsed.type,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        scope: parsed.scope || 'To be determined',
        assumptions: parsed.assumptions || [],
        risks: parsed.risks || [],
      }
    } catch (error) {
      throw new Error(`Failed to parse classification response: ${error}`)
    }
  }

  private buildPrompt(request: AgentRequest, userMessage: string): string {
    const parts: string[] = []

    if (request.messages.length > 1) {
      parts.push('--- Conversation History ---')
      for (const msg of request.messages.slice(0, -1)) {
        parts.push(`${msg.role}: ${msg.content}`)
      }
      parts.push('')
    }

    parts.push(userMessage)

    return parts.join('\n')
  }
}
