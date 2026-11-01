import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { AIAgentService } from './application'
import { AI_AGENT_PORT } from './domain'
import { AI_AGENT_SERVICE, ClaudeAdapter, DisabledAiAgentAdapter } from './infras'

function isAnthropicConfigured(configService: CustomConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

@Module({
  imports: [CustomConfigModule],
  providers: [
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
    {
      provide: AI_AGENT_SERVICE,
      useFactory: (aiAgentPort) => new AIAgentService(aiAgentPort),
      inject: [AI_AGENT_PORT],
    },
  ],
  exports: [AI_AGENT_SERVICE],
})
export class AIAgentModule {}
