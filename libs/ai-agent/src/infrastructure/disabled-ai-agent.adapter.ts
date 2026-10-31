import type { AgentRequest, AgentResponse, IAIAgentPort, WorkflowClassification } from '../domain'

const NOT_CONFIGURED_MESSAGE =
  'Anthropic is not configured. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'

export class DisabledAiAgentAdapter implements IAIAgentPort {
  private notConfigured(): never {
    throw new Error(NOT_CONFIGURED_MESSAGE)
  }

  async chat(_request: AgentRequest): Promise<AgentResponse> {
    this.notConfigured()
  }

  chatStream(_request: AgentRequest): AsyncGenerator<string, void, unknown> {
    const error = new Error(NOT_CONFIGURED_MESSAGE)
    const iterator: AsyncGenerator<string, void, unknown> = {
      next: async () => {
        throw error
      },
      return: async () => ({ done: true, value: undefined }),
      throw: async () => {
        throw error
      },
      [Symbol.asyncIterator]() {
        return this
      },
    }
    return iterator
  }

  async classifyWorkflow(_request: AgentRequest): Promise<WorkflowClassification> {
    this.notConfigured()
  }
}
