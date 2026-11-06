import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from '@vyrak/auth'
import { ConversationModule } from '@vyrak/conversation'
import { CustomConfigModule } from '@vyrak/custom-config'
import { CustomLoggerModule } from '@vyrak/custom-logger'
import { DatabaseModule } from '@vyrak/database'
import { EventBusModule } from '@vyrak/event-bus'
import { WorkflowCoreModule } from '@vyrak/workflow-core'
import { CHAT_TURN_QUEUE } from '@vyrak/workflow-planning'

import { BullChatTurnPublisher } from './chat-turn.publisher'
import { ChatGateway } from './chat.gateway'
import { WsAuthGuard } from './guards/ws-auth.guard'

@Module({
  imports: [
    CustomConfigModule,
    CustomLoggerModule,
    DatabaseModule,
    EventBusModule,
    ConversationModule,
    WorkflowCoreModule,
    BullModule.registerQueue({ name: CHAT_TURN_QUEUE }),
    AuthModule, // Import AuthModule to provide JWT_PROVIDER for WsAuthGuard
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 messages per minute per user
      },
    ]),
  ],
  providers: [ChatGateway, BullChatTurnPublisher, WsAuthGuard],
})
export class ChatModule {}
