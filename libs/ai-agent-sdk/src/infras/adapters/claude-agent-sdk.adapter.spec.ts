import { query } from '@anthropic-ai/claude-agent-sdk'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ClaudeAgentSdkAdapter } from './claude-agent-sdk.adapter'

import type { AgentRequest } from '@vyrak/ai-agent'
import type { AnthropicConfig, IConfigService } from '@vyrak/custom-config'
import type { Mock } from 'vitest'

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}))

const mockQuery = query as unknown as Mock

/**
 * Builds an async iterable that mimics the SDK's AsyncGenerator of messages.
 */
function messagesOf<T>(messages: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield* messages
    },
  }
}

/**
 * Builds an async iterable whose first read rejects, mimicking a failing SDK query.
 */
function failingStream(message: string): AsyncIterable<never> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => Promise.reject(new Error(message)),
    }),
  }
}

/**
 * The adapter only reads `configService.anthropic`, so a narrow stub keeps the
 * test independent of the rest of the config surface.
 */
function configWith(anthropic?: Partial<AnthropicConfig>): IConfigService {
  return {
    anthropic: {
      apiKey: 'test-api-key',
      model: 'claude-sonnet-4-20250514',
      ...anthropic,
    },
  } as IConfigService
}

function baseRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
  return {
    messages: [{ role: 'user', content: 'Hello' }],
    ...overrides,
  }
}

const textDelta = (text: string) => ({
  type: 'stream_event',
  delta: { type: 'text_delta', text },
})

const successResult = (result: string) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result,
})

describe('ClaudeAgentSdkAdapter', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  describe('constructor', () => {
    it('should accept a complete anthropic config', () => {
      const adapter = new ClaudeAgentSdkAdapter(configWith())

      expect(adapter).toBeInstanceOf(ClaudeAgentSdkAdapter)
    })

    it('should throw when anthropic config is absent', () => {
      const config = { anthropic: undefined } as IConfigService

      expect(() => new ClaudeAgentSdkAdapter(config)).toThrow(
        'Anthropic config is missing. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'
      )
    })

    it('should throw when apiKey is empty', () => {
      const config = configWith({ apiKey: '', model: 'claude-sonnet-4' })

      expect(() => new ClaudeAgentSdkAdapter(config)).toThrow('Anthropic config is missing')
    })

    it('should throw when model is empty', () => {
      const config = configWith({ apiKey: 'test-key', model: '' })

      expect(() => new ClaudeAgentSdkAdapter(config)).toThrow('Anthropic config is missing')
    })
  })

  describe('chat()', () => {
    let adapter: ClaudeAgentSdkAdapter

    beforeEach(() => {
      adapter = new ClaudeAgentSdkAdapter(configWith({ model: 'claude-sonnet-4-test' }))
    })

    it('should return the result message content', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('Final answer')]))

      const response = await adapter.chat(baseRequest())

      expect(response).toEqual({
        content: 'Final answer',
        finishReason: 'end_turn',
        usage: { inputTokens: 0, outputTokens: 0 },
      })
    })

    it('should concatenate streamed text deltas', async () => {
      mockQuery.mockReturnValue(messagesOf([textDelta('Hel'), textDelta('lo'), textDelta('!')]))

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('Hello!')
    })

    it('should append deltas that arrive after the result message', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('Base'), textDelta(', tail')]))

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('Base, tail')
    })

    it('should let a later result message replace accumulated deltas', async () => {
      mockQuery.mockReturnValue(messagesOf([textDelta('draft'), successResult('final')]))

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('final')
    })

    it('should ignore result messages flagged as errors', async () => {
      mockQuery.mockReturnValue(
        messagesOf([{ type: 'result', subtype: 'success', is_error: true, result: 'ignored' }, textDelta('kept')])
      )

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('kept')
    })

    it('should ignore result messages with a non-success subtype', async () => {
      mockQuery.mockReturnValue(
        messagesOf([
          { type: 'result', subtype: 'error_max_turns', is_error: false, result: 'ignored' },
          textDelta('kept'),
        ])
      )

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('kept')
    })

    it('should ignore unrelated message types', async () => {
      mockQuery.mockReturnValue(messagesOf([{ type: 'assistant' }, { type: 'system' }, textDelta('only text')]))

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('only text')
    })

    it('should return an empty content when no assistant output is produced', async () => {
      mockQuery.mockReturnValue(messagesOf([{ type: 'system' }]))

      const response = await adapter.chat(baseRequest())

      expect(response.content).toBe('')
    })

    it('should pass model, cwd and allowed tools to the SDK', async () => {
      mockQuery.mockReturnValue(messagesOf([]))
      const request = baseRequest({ workingDirectory: '/tmp/work', allowedTools: ['Read', 'Bash'] })

      await adapter.chat(request)

      const args = mockQuery.mock.calls[0][0] as {
        options: { model: string; cwd?: string; allowedTools: string[]; maxTurns: number }
      }
      expect(args.options.model).toBe('claude-sonnet-4-test')
      expect(args.options.cwd).toBe('/tmp/work')
      expect(args.options.allowedTools).toEqual(['Read', 'Bash'])
      expect(args.options.maxTurns).toBe(8)
    })

    it('should default allowed tools to an empty array', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await adapter.chat(baseRequest())

      const args = mockQuery.mock.calls[0][0] as { options: { allowedTools: string[] } }
      expect(args.options.allowedTools).toEqual([])
    })

    it('should forward a system prompt when provided', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await adapter.chat(baseRequest({ systemPrompt: 'Be terse' }))

      const args = mockQuery.mock.calls[0][0] as {
        options: { systemPrompt?: { type: string; prompt: string } }
      }
      expect(args.options.systemPrompt).toEqual({ type: 'custom', prompt: 'Be terse' })
    })

    it('should omit the system prompt when not provided', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await adapter.chat(baseRequest())

      const args = mockQuery.mock.calls[0][0] as { options: { systemPrompt?: unknown } }
      expect(args.options.systemPrompt).toBeUndefined()
    })

    it('should send a bare user message for a single-message conversation', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await adapter.chat(baseRequest({ messages: [{ role: 'user', content: 'Only message' }] }))

      const args = mockQuery.mock.calls[0][0] as { prompt: string }
      expect(args.prompt).toBe('Only message')
    })

    it('should prepend conversation history when multiple messages exist', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await adapter.chat(
        baseRequest({
          messages: [
            { role: 'user', content: 'First' },
            { role: 'assistant', content: 'Second' },
            { role: 'user', content: 'Third' },
          ],
        })
      )

      const args = mockQuery.mock.calls[0][0] as { prompt: string }
      expect(args.prompt).toBe(
        ['--- Conversation History ---', 'user: First', 'assistant: Second', '', 'Third'].join('\n')
      )
    })

    it('should fall back to an empty prompt when the message list is empty', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await adapter.chat(baseRequest({ messages: [] }))

      const args = mockQuery.mock.calls[0][0] as { prompt: string }
      expect(args.prompt).toBe('')
    })

    it('should propagate SDK errors', async () => {
      mockQuery.mockReturnValue(failingStream('SDK unavailable'))

      await expect(adapter.chat(baseRequest())).rejects.toThrow('SDK unavailable')
    })
  })

  describe('chatStream()', () => {
    let adapter: ClaudeAgentSdkAdapter

    beforeEach(() => {
      adapter = new ClaudeAgentSdkAdapter(configWith())
    })

    it('should yield text deltas in order', async () => {
      mockQuery.mockReturnValue(messagesOf([textDelta('Hel'), textDelta('lo'), successResult('ignored')]))

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(baseRequest())) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hel', 'lo'])
    })

    it('should skip non-delta messages', async () => {
      mockQuery.mockReturnValue(messagesOf([{ type: 'assistant' }, successResult('ignored'), textDelta('visible')]))

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(baseRequest())) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['visible'])
    })

    it('should yield nothing when the stream has no text deltas', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('not streamed')]))

      const chunks: string[] = []
      for await (const chunk of adapter.chatStream(baseRequest())) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual([])
    })

    it('should pass the same options as chat()', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      for await (const _chunk of adapter.chatStream(
        baseRequest({ workingDirectory: '/tmp/stream', allowedTools: ['Grep'], systemPrompt: 'Sys' })
      )) {
        // drain
      }

      const args = mockQuery.mock.calls[0][0] as {
        options: {
          model: string
          cwd?: string
          allowedTools: string[]
          maxTurns: number
          systemPrompt?: { type: string; prompt: string }
        }
      }
      expect(args.options.cwd).toBe('/tmp/stream')
      expect(args.options.allowedTools).toEqual(['Grep'])
      expect(args.options.systemPrompt).toEqual({ type: 'custom', prompt: 'Sys' })
    })

    it('should propagate SDK errors', async () => {
      mockQuery.mockReturnValue(failingStream('stream failed'))

      const drain = async () => {
        for await (const _chunk of adapter.chatStream(baseRequest())) {
          // drain
        }
      }

      await expect(drain()).rejects.toThrow('stream failed')
    })

    it('should stream with an empty prompt when the message list is empty', async () => {
      mockQuery.mockReturnValue(messagesOf([textDelta('chunk')]))
      const chunks: string[] = []

      for await (const chunk of adapter.chatStream(baseRequest({ messages: [] }))) {
        chunks.push(chunk)
      }

      const args = mockQuery.mock.calls[0][0] as { prompt: string }
      expect(args.prompt).toBe('')
      expect(chunks).toEqual(['chunk'])
    })
  })

  describe('stream()', () => {
    let adapter: ClaudeAgentSdkAdapter

    const assistantMessage = (...content: unknown[]) => ({ type: 'assistant', message: { content } })

    const streamRequest = {
      prompt: 'system\n\nUser message',
      workingDirectory: '/repos/acme/app',
      allowedTools: ['Read', 'Write'],
      maxTurns: 7,
    }

    async function collect(request = streamRequest) {
      const events = []
      for await (const event of adapter.stream(request)) {
        events.push(event)
      }
      return events
    }

    beforeEach(() => {
      adapter = new ClaudeAgentSdkAdapter(configWith({ model: 'claude-worker-model' }))
    })

    it('should map thinking, text and tool_use blocks to events in order', async () => {
      mockQuery.mockReturnValue(
        messagesOf([
          assistantMessage({ type: 'thinking', thinking: 'hmm' }, { type: 'text', text: 'Hello ' }),
          assistantMessage({ type: 'tool_use', name: 'Write', input: { file_path: 'docs/prd.md' } }),
          assistantMessage({ type: 'text', text: 'world' }),
          successResult('Hello world'),
        ])
      )

      const events = await collect()

      expect(events).toEqual([
        { type: 'thinking', content: '🤔 Thinking...' },
        { type: 'delta', content: 'Hello ' },
        { type: 'tool', name: 'Write', input: { file_path: 'docs/prd.md' } },
        { type: 'delta', content: 'world' },
        { type: 'complete', content: 'Hello world' },
      ])
    })

    it('should pass the configured model, prompt, working directory, tools and max turns to the SDK', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await collect()

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: 'system\n\nUser message',
        options: {
          model: 'claude-worker-model',
          env: expect.any(Object),
          cwd: '/repos/acme/app',
          allowedTools: ['Read', 'Write'],
          maxTurns: 7,
        },
      })
    })

    it('should hand an x-api-key credential to the claude subprocess through its environment', async () => {
      mockQuery.mockReturnValue(messagesOf([]))
      adapter = new ClaudeAgentSdkAdapter(
        configWith({ apiKey: 'key-1', authScheme: 'x-api-key', apiUrl: 'http://proxy.internal:20128' })
      )

      await collect()

      const env = mockQuery.mock.calls[0][0].options.env
      expect(env.ANTHROPIC_API_KEY).toBe('key-1')
      expect(env.ANTHROPIC_BASE_URL).toBe('http://proxy.internal:20128')
    })

    it('should send a bearer credential as ANTHROPIC_AUTH_TOKEN and drop ANTHROPIC_API_KEY', async () => {
      mockQuery.mockReturnValue(messagesOf([]))
      adapter = new ClaudeAgentSdkAdapter(configWith({ apiKey: 'key-2', authScheme: 'bearer' }))

      await collect()

      const env = mockQuery.mock.calls[0][0].options.env
      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('key-2')
      expect(env.ANTHROPIC_API_KEY).toBeUndefined()
    })

    it('should default to no tools and 20 turns when the request omits them', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await collect({ prompt: 'p', workingDirectory: '/repo' } as typeof streamRequest)

      const options = mockQuery.mock.calls[0][0].options
      expect(options.allowedTools).toEqual([])
      expect(options.maxTurns).toBe(20)
    })

    it('should not emit complete when no text was produced', async () => {
      mockQuery.mockReturnValue(
        messagesOf([assistantMessage({ type: 'thinking', thinking: 'hmm' }), successResult('')])
      )

      const events = await collect()

      expect(events).toEqual([{ type: 'thinking', content: '🤔 Thinking...' }])
    })

    it('should ignore empty blocks, non-assistant messages and tool_use blocks without a name', async () => {
      mockQuery.mockReturnValue(
        messagesOf([
          { type: 'system', message: { content: [{ type: 'text', text: 'ignored' }] } },
          assistantMessage({ type: 'text', text: '' }, { type: 'thinking', thinking: '' }, { type: 'tool_use' }),
          { type: 'assistant', message: { content: 'not an array' } },
        ])
      )

      const events = await collect()

      expect(events).toEqual([])
    })

    it('should propagate SDK errors after the events already produced', async () => {
      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield assistantMessage({ type: 'text', text: 'partial' })
          throw new Error('query failed')
        },
      })

      const received: unknown[] = []
      const consume = async () => {
        for await (const event of adapter.stream(streamRequest)) {
          received.push(event)
        }
      }

      await expect(consume()).rejects.toThrow('query failed')
      expect(received).toEqual([{ type: 'delta', content: 'partial' }])
    })
  })

  describe('classifyWorkflow()', () => {
    let adapter: ClaudeAgentSdkAdapter

    beforeEach(() => {
      adapter = new ClaudeAgentSdkAdapter(configWith())
    })

    it('should parse a plain JSON classification', async () => {
      mockQuery.mockReturnValue(
        messagesOf([
          successResult(
            JSON.stringify({
              type: 'EPIC',
              confidence: 0.92,
              reasoning: 'Spans many services',
              scope: 'Payments and billing',
              assumptions: ['Team available'],
              risks: ['Data migration'],
            })
          ),
        ])
      )

      const classification = await adapter.classifyWorkflow(
        baseRequest({ messages: [{ role: 'user', content: 'Redesign payments' }] })
      )

      expect(classification).toEqual({
        type: 'EPIC',
        confidence: 0.92,
        reasoning: 'Spans many services',
        scope: 'Payments and billing',
        assumptions: ['Team available'],
        risks: ['Data migration'],
      })
    })

    it('should extract JSON wrapped in a markdown code fence', async () => {
      mockQuery.mockReturnValue(
        messagesOf([
          successResult(
            'Here is the result:\n```json\n{"type":"STORY","confidence":0.8,"reasoning":"Single feature"}\n```'
          ),
        ])
      )

      const classification = await adapter.classifyWorkflow(baseRequest())

      expect(classification.type).toBe('STORY')
      expect(classification.confidence).toBe(0.8)
    })

    it('should default scope, assumptions and risks when omitted', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('{"type":"HOTFIX","confidence":0.5,"reasoning":"Urgent"}')]))

      const classification = await adapter.classifyWorkflow(baseRequest())

      expect(classification.scope).toBe('To be determined')
      expect(classification.assumptions).toEqual([])
      expect(classification.risks).toEqual([])
    })

    it('should build the prompt from conversation history and cap turns', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('{"type":"STORY","confidence":1,"reasoning":"r"}')]))

      await adapter.classifyWorkflow(
        baseRequest({
          messages: [
            { role: 'user', content: 'Need auth' },
            { role: 'assistant', content: 'Any constraints?' },
          ],
        })
      )

      const args = mockQuery.mock.calls[0][0] as {
        prompt: string
        options: { allowedTools: string[]; maxTurns: number }
      }
      expect(args.prompt).toContain('classify this workflow')
      expect(args.prompt).toContain('user: Need auth')
      expect(args.prompt).toContain('assistant: Any constraints?')
      expect(args.options.allowedTools).toEqual([])
      expect(args.options.maxTurns).toBe(1)
    })

    it('should throw when the response contains no JSON', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('I cannot help with that')]))

      await expect(adapter.classifyWorkflow(baseRequest())).rejects.toThrow(
        /Failed to parse classification response: Error: No JSON found in response/
      )
    })

    it('should throw when the response is empty', async () => {
      mockQuery.mockReturnValue(messagesOf([]))

      await expect(adapter.classifyWorkflow(baseRequest())).rejects.toThrow('Failed to parse classification response')
    })

    it('should throw when the JSON is malformed', async () => {
      mockQuery.mockReturnValue(messagesOf([successResult('{not valid json}')]))

      await expect(adapter.classifyWorkflow(baseRequest())).rejects.toThrow('Failed to parse classification response')
    })

    it('should ignore result messages that are not successes', async () => {
      mockQuery.mockReturnValue(
        messagesOf([
          { type: 'result', subtype: 'error_max_turns', is_error: false, result: '{"type":"STORY"}' },
          successResult('{"type":"HOTFIX","confidence":0.6,"reasoning":"small"}'),
        ])
      )

      const classification = await adapter.classifyWorkflow(baseRequest())

      expect(classification.type).toBe('HOTFIX')
    })

    it('should propagate SDK errors during classification', async () => {
      mockQuery.mockReturnValue(failingStream('query failed'))

      await expect(adapter.classifyWorkflow(baseRequest())).rejects.toThrow('query failed')
    })
  })
})
