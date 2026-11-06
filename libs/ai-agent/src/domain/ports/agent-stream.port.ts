/**
 * Events produced while an agent answers one chat turn.
 *
 * `complete` carries the full accumulated text and is only produced when the agent
 * wrote a non-empty answer. Failures surface as a thrown error from `stream`;
 * `error` is part of the union so callers can forward failures as events.
 */
export type ChatEvent =
  | { type: 'thinking'; content: string }
  | { type: 'delta'; content: string }
  | { type: 'tool'; name: string; input: unknown }
  | { type: 'complete'; content: string }
  | { type: 'error'; message: string }

export interface AgentStreamRequest {
  /** Full prompt, including system instructions and conversation history. */
  prompt: string
  /** Directory the agent tools operate in (repository checkout). */
  workingDirectory: string
  allowedTools?: string[]
  maxTurns?: number
}

/**
 * Agent Stream Port - streams one chat turn as discrete events.
 */
export interface IAgentStreamPort {
  stream(request: AgentStreamRequest): AsyncGenerator<ChatEvent, void, unknown>
}

/**
 * Token for dependency injection - streaming chat adapter (Agent SDK)
 */
export const AI_AGENT_STREAM_PORT = Symbol('AI_AGENT_STREAM_PORT')
