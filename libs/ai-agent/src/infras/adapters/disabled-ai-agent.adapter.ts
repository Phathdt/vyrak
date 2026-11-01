import type { AgentRequest, AgentResponse, IAIAgentPort, WorkflowClassification } from '../../domain'

const NOT_CONFIGURED_MESSAGE =
  'Anthropic is not configured. Set ANTHROPIC__API_KEY and ANTHROPIC__MODEL in apps/api-server/.env'

export class DisabledAiAgentAdapter implements IAIAgentPort {
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

  async classifyWorkflow(_request: AgentRequest): Promise<WorkflowClassification> {
    this.notConfigured()
  }
}
