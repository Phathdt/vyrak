import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { AIAgentService } from './application'
import { AI_AGENT_PORT } from './domain'
import { ClaudeAdapter } from './infrastructure'

@Module({
  imports: [CustomConfigModule],
  providers: [
    AIAgentService,
    {
      provide: AI_AGENT_PORT,
      useFactory: (configService: CustomConfigService) => {
        return new ClaudeAdapter(configService)
      },
      inject: [CustomConfigService],
    },
  ],
  exports: [AIAgentService],
})
export class AIAgentModule {}
