import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { AIAgentService } from './application'
import { AI_AGENT_AGENT_PORT, AI_AGENT_PORT } from './domain'
import { AI_AGENT_SERVICE, ClaudeAgentSdkAdapter, DisabledAiAgentAdapter } from './infras'

function isAnthropicConfigured(configService: CustomConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

@Module({
  imports: [CustomConfigModule],
  providers: [
    // Agent SDK adapter
    {
      provide: AI_AGENT_AGENT_PORT,
      useFactory: (configService: CustomConfigService) => {
        if (!isAnthropicConfigured(configService)) {
          return new DisabledAiAgentAdapter()
        }
        return new ClaudeAgentSdkAdapter(configService)
      },
      inject: [CustomConfigService],
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
  exports: [AI_AGENT_SERVICE],
})
export class AIAgentModule {}
