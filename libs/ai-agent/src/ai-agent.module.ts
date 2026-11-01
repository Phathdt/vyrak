import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { AIAgentService } from './application'
import { AI_AGENT_AGENT_PORT, AI_AGENT_CHAT_PORT, AI_AGENT_PORT } from './domain'
import { AI_AGENT_SERVICE, ClaudeAdapter, ClaudeAgentAdapter, DisabledAiAgentAdapter } from './infras'

function isAnthropicConfigured(configService: CustomConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

@Module({
  imports: [CustomConfigModule],
  providers: [
    // Legacy port for backward compatibility
    {
      provide: AI_AGENT_PORT,
      useFactory: (configService: CustomConfigService) => {
        if (!isAnthropicConfigured(configService)) {
          return new DisabledAiAgentAdapter()
        }
        return new ClaudeAdapter(configService)
      },
      inject: [CustomConfigService],
    },
    // Chat adapter (Messages API - lightweight)
    {
      provide: AI_AGENT_CHAT_PORT,
      useFactory: (configService: CustomConfigService) => {
        if (!isAnthropicConfigured(configService)) {
          return new DisabledAiAgentAdapter()
        }
        return new ClaudeAdapter(configService)
      },
      inject: [CustomConfigService],
    },
    // Agent adapter (Agent SDK - with tools)
    {
      provide: AI_AGENT_AGENT_PORT,
      useFactory: (configService: CustomConfigService) => {
        if (!isAnthropicConfigured(configService)) {
          return new DisabledAiAgentAdapter()
        }
        return new ClaudeAgentAdapter(configService)
      },
      inject: [CustomConfigService],
    },
    // Service with both adapters
    {
      provide: AI_AGENT_SERVICE,
      useFactory: (chatPort, agentPort) => new AIAgentService(chatPort, agentPort),
      inject: [AI_AGENT_CHAT_PORT, AI_AGENT_AGENT_PORT],
    },
  ],
  exports: [AI_AGENT_SERVICE],
})
export class AIAgentModule {}
