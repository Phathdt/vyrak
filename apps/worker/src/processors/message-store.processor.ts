import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { IConversationService, CONVERSATION_SERVICE, MessageRole } from '@vyrak/conversation'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { IEventBus, EVENT_BUS } from '@vyrak/event-bus'

import type { AgentMessageUserEvent, AgentMessageCompleteEvent } from '@vyrak/event-bus'

@Injectable()
export class MessageStoreProcessor implements OnModuleInit {
  private readonly logger: EnhancedLogger

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    enhancedLogger: EnhancedLogger
  ) {
    this.logger = enhancedLogger.with({ context: 'MessageWorker' })
  }

  async onModuleInit() {
    // Subscribe to user messages
    await this.eventBus.subscribe<AgentMessageUserEvent>('agent.message.user', this.handleUserMessage.bind(this), {
      group: 'message-workers',
      consumer: `message-worker-${process.pid}-user`,
      maxRetries: 3,
    })

    // Subscribe to complete messages
    await this.eventBus.subscribe<AgentMessageCompleteEvent>(
      'agent.message.complete',
      this.handleCompleteMessage.bind(this),
      {
        group: 'message-workers',
        consumer: `message-worker-${process.pid}-complete`,
        maxRetries: 3,
      }
    )

    this.logger.log('Subscribed to message events')
  }

  private async handleUserMessage(event: AgentMessageUserEvent): Promise<void> {
    try {
      // Generate deterministic eventId from event data
      const eventId = `user-${event.sessionId}-${event.timestamp}`

      await this.conversationService.addMessage({
        sessionId: event.sessionId,
        role: MessageRole.USER,
        content: event.message,
        eventId, // Pass eventId for idempotency
      })

      this.logger.log(`Stored user message for session ${event.sessionId}`)
    } catch (error) {
      this.logger.error(error as Error, 'Failed to store user message')
      // Throw to trigger retry logic in event bus
      throw error
    }
  }

  private async handleCompleteMessage(event: AgentMessageCompleteEvent): Promise<void> {
    try {
      // Generate deterministic eventId
      const eventId = `complete-${event.sessionId}-${event.messageId}`

      await this.conversationService.addMessage({
        sessionId: event.sessionId,
        role: MessageRole.ASSISTANT,
        content: event.content,
        eventId, // Pass eventId for idempotency
      })

      this.logger.log(`Stored AI message for session ${event.sessionId}`)
    } catch (error) {
      this.logger.error(error as Error, 'Failed to store AI message')
      // Throw to trigger retry logic in event bus
      throw error
    }
  }
}
