import Anthropic from '@anthropic-ai/sdk'

import type { AgentRequest, AgentResponse, IAIAgentPort, Message, WorkflowClassification } from '../../domain'

export class ClaudeAdapter implements IAIAgentPort {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  /**
   * Convert our Message format to Claude format
   */
  private toClaudeMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }

  /**
   * Send chat request to Claude
   */
  async chat(request: AgentRequest): Promise<AgentResponse> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: this.toClaudeMessages(request.messages),
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    return {
      content: content.text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      finishReason: response.stop_reason || undefined,
    }
  }

  /**
   * Stream chat response from Claude
   */
  async *chatStream(request: AgentRequest): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: this.toClaudeMessages(request.messages),
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text
      }
    }
  }

  /**
   * Classify workflow using Claude with structured output
   */
  async classifyWorkflow(request: AgentRequest): Promise<WorkflowClassification> {
    const classificationPrompt = `
You are an AI assistant helping to classify software development workflows.

Based on the conversation history, classify this workflow into one of three types:
- HOTFIX: Urgent bug fixes, small scope, single task
- STORY: Single feature, can be completed in one sprint, independent
- EPIC: Large feature requiring multiple stories, needs breakdown

Analyze the requirements discussed and provide:
1. Classification type (HOTFIX/STORY/EPIC)
2. Confidence score (0.0 to 1.0)
3. Detailed reasoning
4. Scope description
5. Key assumptions
6. Potential risks

Respond in JSON format:
{
  "type": "EPIC" | "STORY" | "HOTFIX",
  "confidence": 0.85,
  "reasoning": "...",
  "scope": "...",
  "assumptions": ["..."],
  "risks": ["..."]
}
`

    const response = await this.chat({
      ...request,
      systemPrompt: classificationPrompt,
      temperature: 0.3, // Lower temperature for more consistent classification
    })

    // Parse JSON response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const classification = JSON.parse(jsonMatch[0]) as WorkflowClassification
      return classification
    } catch (error) {
      throw new Error(`Failed to parse classification response: ${error}`)
    }
  }
}
