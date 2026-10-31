import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { ConversationService } from './application'
import { CONVERSATION_REPOSITORY } from './domain'
import { PrismaConversationRepository } from './infrastructure'

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
