import { Module } from '@nestjs/common'

import { AIAgentService } from './application'
import { AI_AGENT_PORT } from './domain'
import { ClaudeAdapter } from './infrastructure'

@Module({
  providers: [
    AIAgentService,
    {
      provide: AI_AGENT_PORT,
      useClass: ClaudeAdapter,
    },
  ],
  exports: [AIAgentService],
})
export class AIAgentModule {}
