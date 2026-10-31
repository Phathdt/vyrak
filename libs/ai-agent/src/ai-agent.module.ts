import { Module } from '@nestjs/common'

import { AIAgentService } from './application/ai-agent.service'
import { AI_AGENT_PORT } from './domain/ports/ai-agent.port'
import { ClaudeAdapter } from './infrastructure/claude/claude.adapter'

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
