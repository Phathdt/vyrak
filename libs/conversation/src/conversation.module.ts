import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { ConversationService } from './application/conversation.service'
import { CONVERSATION_REPOSITORY } from './domain/repositories/conversation.repository'
import { PrismaConversationRepository } from './infrastructure/prisma/prisma-conversation.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    ConversationService,
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: PrismaConversationRepository,
    },
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
