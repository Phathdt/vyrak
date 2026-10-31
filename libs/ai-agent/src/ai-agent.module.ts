import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { AIAgentService } from './application'
import { AI_AGENT_PORT } from './domain'
import { ClaudeAdapter, DisabledAiAgentAdapter } from './infrastructure'

function isAnthropicConfigured(configService: CustomConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

@Module({
  imports: [CustomConfigModule],
  providers: [
    AIAgentService,
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
  ],
  exports: [AIAgentService],
})
export class AIAgentModule {}
