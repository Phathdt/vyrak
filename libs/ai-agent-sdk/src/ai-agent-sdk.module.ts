import { Module } from '@nestjs/common'
import {
  AI_AGENT_AGENT_PORT,
  AI_AGENT_SERVICE,
  AI_AGENT_STREAM_PORT,
  AIAgentService,
  DisabledAiAgentAdapter,
} from '@vyrak/ai-agent'
import { CONFIG_SERVICE, CustomConfigModule, type IConfigService } from '@vyrak/custom-config'

import { ClaudeAgentSdkAdapter } from './infras/adapters/claude-agent-sdk.adapter'

function isAnthropicConfigured(configService: IConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

/**
 * Agent SDK wiring. Only the processes that run agent tools (the worker) import this
 * module; the api-server must not, so the Claude Code SDK stays out of its bundle.
 */
@Module({
  imports: [CustomConfigModule],
  providers: [
    {
      provide: AI_AGENT_AGENT_PORT,
      useFactory: (configService: IConfigService) => {
        if (!isAnthropicConfigured(configService)) {
          return new DisabledAiAgentAdapter()
        }
        return new ClaudeAgentSdkAdapter(configService)
      },
      inject: [CONFIG_SERVICE],
    },
    {
      provide: AI_AGENT_SERVICE,
      useFactory: (agentPort) => new AIAgentService(agentPort),
      inject: [AI_AGENT_AGENT_PORT],
    },
    {
      provide: AI_AGENT_STREAM_PORT,
      useExisting: AI_AGENT_AGENT_PORT,
    },
  ],
  exports: [AI_AGENT_SERVICE, AI_AGENT_STREAM_PORT, AI_AGENT_AGENT_PORT],
})
export class AIAgentSdkModule {}
