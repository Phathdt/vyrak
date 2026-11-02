import Anthropic from '@anthropic-ai/sdk'

import type { AgentRequest, AgentResponse, IAIAgentPort, WorkflowClassification } from '../../../domain'
import type { IConfigService } from '@vyrak/custom-config'

/**
 * Anthropic API Adapter
 *
 * Uses the official @anthropic-ai/sdk (Messages API) WITHOUT tools.
 * Designed for Planning phase to prevent technical contamination.
 * Pure LLM interaction - no code access, no file scouting.
 */
export class AnthropicApiAdapter implements IAIAgentPort {
  private client: Anthropic
  private model: string

  constructor(private readonly configService: IConfigService) {
    const anthropic = this.configService.anthropic
    if (!anthropic?.apiKey || !anthropic.model) {
      throw new Error(
        'Anthropic config is missing. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'
      )
    }

    this.model = anthropic.model

    // Initialize Anthropic SDK client
    this.client = new Anthropic({
      apiKey: anthropic.apiKey,
      baseURL: anthropic.apiUrl ? `${anthropic.apiUrl}/v1` : undefined,
    })
  }

  async chat(request: AgentRequest): Promise<AgentResponse> {
    // Sanitize user input to remove technical contamination
    const sanitizedMessages = request.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.role === 'user' ? this.sanitizeInput(msg.content) : msg.content,
    }))

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages: sanitizedMessages,
    })

    // Extract text content (skip thinking blocks if present)
    const textBlock = response.content.find((block) => block.type === 'text')
    const content = textBlock && 'text' in textBlock ? textBlock.text : ''

    return {
      content,
      finishReason: response.stop_reason || 'end_turn',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  }

  async *chatStream(request: AgentRequest): AsyncGenerator<string> {
    // Sanitize user input to remove technical contamination
    const sanitizedMessages = request.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.role === 'user' ? this.sanitizeInput(msg.content) : msg.content,
    }))

    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: request.maxTokens || 4096,
      system: request.systemPrompt,
      messages: sanitizedMessages,
      stream: true,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
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

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const resultText = textBlock && 'text' in textBlock ? textBlock.text : ''

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

  /**
   * Sanitize user input to remove technical contamination
   * Prevents the LLM from getting context clues about implementation details
   */
  private sanitizeInput(input: string): string {
    let sanitized = input

    // Remove technical file paths (e.g., /products -> page)
    sanitized = sanitized.replace(/\/[a-z-]+(?=\s|$|[,.])/g, ' page')

    // Replace technology names with generic terms
    const techReplacements: Record<string, string> = {
      React: 'web technology',
      TypeScript: 'web technology',
      JavaScript: 'web technology',
      Vite: 'build tool',
      component: 'UI element',
      endpoint: 'feature',
      ' API ': ' service ',
      'REST API': 'service',
    }

    for (const [tech, replacement] of Object.entries(techReplacements)) {
      const regex = new RegExp(tech, 'gi')
      sanitized = sanitized.replace(regex, replacement)
    }

    // Remove code blocks
    sanitized = sanitized.replace(/```[\s\S]*?```/g, '[code snippet]')

    return sanitized
  }
}
