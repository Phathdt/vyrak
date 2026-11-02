import { Module } from '@nestjs/common'
import { CONFIG_SERVICE, CustomConfigModule, type IConfigService } from '@vyrak/custom-config'

import { AIAgentService } from './application'
import { AI_AGENT_AGENT_PORT, AI_AGENT_API_PORT, AI_AGENT_PORT } from './domain'
import { AI_AGENT_SERVICE, AnthropicApiAdapter, ClaudeAgentSdkAdapter, DisabledAiAgentAdapter } from './infras'

function isAnthropicConfigured(configService: IConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

@Module({
  imports: [CustomConfigModule],
  providers: [
    // Agent SDK adapter (with tools for Tech Refinement onwards)
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
    // API SDK adapter (no tools for Planning phase)
    {
      provide: AI_AGENT_API_PORT,
      useFactory: (configService: IConfigService) => {
        if (!isAnthropicConfigured(configService)) {
          return new DisabledAiAgentAdapter()
        }
        return new AnthropicApiAdapter(configService)
      },
      inject: [CONFIG_SERVICE],
    },
    // Service with Agent SDK
    {
      provide: AI_AGENT_SERVICE,
      useFactory: (agentPort) => new AIAgentService(agentPort),
      inject: [AI_AGENT_AGENT_PORT],
    },
    // Legacy port for backward compatibility (deprecated)
    {
      provide: AI_AGENT_PORT,
      useExisting: AI_AGENT_AGENT_PORT,
    },
  ],
  exports: [AI_AGENT_SERVICE, AI_AGENT_API_PORT],
})
export class AIAgentModule {}
