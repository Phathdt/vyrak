import type {
  AgentRequest,
  AgentResponse,
  AgentStreamRequest,
  ChatEvent,
  IAgentStreamPort,
  IAIAgentPort,
  WorkflowClassification,
} from '../../domain'

const NOT_CONFIGURED_MESSAGE =
  'Anthropic is not configured. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'

export class DisabledAiAgentAdapter implements IAIAgentPort, IAgentStreamPort {
  private notConfigured(): never {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  async chat(_request: AgentRequest): Promise<AgentResponse> {
    this.notConfigured()
  }

  async *chatStream(_request: AgentRequest): AsyncGenerator<string, void, unknown> {
    for (const _chunk of [] as string[]) {
      yield _chunk
    }
    this.notConfigured()
  }

  async *stream(_request: AgentStreamRequest): AsyncGenerator<ChatEvent, void, unknown> {
    for (const _event of [] as ChatEvent[]) {
      yield _event
    }
    this.notConfigured()
  }

  async classifyWorkflow(_request: AgentRequest): Promise<WorkflowClassification> {
    this.notConfigured()
  }
}
