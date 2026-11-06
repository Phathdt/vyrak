import { Module } from '@nestjs/common'
import { CONFIG_SERVICE, CustomConfigModule, type IConfigService } from '@vyrak/custom-config'

import { AI_AGENT_API_PORT } from './domain'
import { AnthropicApiAdapter, DisabledAiAgentAdapter } from './infras'

function isAnthropicConfigured(configService: IConfigService): boolean {
  const apiKey = configService.anthropic?.apiKey
  return Boolean(apiKey && apiKey !== 'replace_me')
}

/**
 * Plain Anthropic API access (no tools, no Claude Code binary). Safe for the api-server.
 * Agent SDK wiring lives in `@vyrak/ai-agent-sdk` and is imported by the worker only.
 */
@Module({
  imports: [CustomConfigModule],
  providers: [
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
  ],
  exports: [AI_AGENT_API_PORT],
})
export class AIAgentModule {}
