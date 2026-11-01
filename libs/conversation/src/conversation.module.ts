import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { ConversationService } from './application'
import { CONVERSATION_REPOSITORY, CONVERSATION_SERVICE, ConversationPrismaRepository } from './infras'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: CONVERSATION_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new ConversationPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: CONVERSATION_SERVICE,
      useFactory: (repository) => new ConversationService(repository),
      inject: [CONVERSATION_REPOSITORY],
    },
  ],
  exports: [CONVERSATION_SERVICE],
})
export class ConversationModule {}
