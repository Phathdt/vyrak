import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { IConversationService, CONVERSATION_SERVICE, MessageRole } from '@vyrak/conversation'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { IEventBus, EVENT_BUS, AgentMessageUserEventSchema, AgentMessageCompleteEventSchema } from '@vyrak/event-bus'

import { withTenantContext } from '../common/decorators/with-tenant-context.decorator'
import { WorkerProcessingError } from '../common/errors/worker-error'

import type { AgentMessageUserEvent, AgentMessageCompleteEvent } from '@vyrak/event-bus'

@Injectable()
export class MessageStoreProcessor implements OnModuleInit {
  private readonly logger: EnhancedLogger

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    private readonly databaseService: DatabaseService,
    enhancedLogger: EnhancedLogger
  ) {
    this.logger = enhancedLogger.with({ context: 'MessageWorker' })
  }

  async onModuleInit() {
    // Validate before the tenant wrapper reads metadata.orgId, so malformed events never set tenant context
    const userHandler = withTenantContext(this.databaseService, this.handleUserMessage.bind(this))
    await this.eventBus.subscribe<unknown>(
      'agent.message.user',
      (rawEvent) => userHandler(this.parseEvent('agent.message.user', AgentMessageUserEventSchema, rawEvent)),
      {
        group: 'message-workers',
        consumer: `message-worker-${process.pid}-user`,
        maxRetries: 3,
      }
    )

    const completeHandler = withTenantContext(this.databaseService, this.handleCompleteMessage.bind(this))
    await this.eventBus.subscribe<unknown>(
      'agent.message.complete',
      (rawEvent) =>
        completeHandler(this.parseEvent('agent.message.complete', AgentMessageCompleteEventSchema, rawEvent)),
      {
        group: 'message-workers',
        consumer: `message-worker-${process.pid}-complete`,
        maxRetries: 3,
      }
    )

    this.logger.log('Subscribed to message events')
  }

  private parseEvent<T>(
    eventName: string,
    schema: { safeParse(data: unknown): { success: true; data: T } | { success: false; error: { message: string } } },
    rawEvent: unknown
  ): T {
    const parseResult = schema.safeParse(rawEvent)
    if (!parseResult.success) {
      const message = `Invalid ${eventName} event schema: ${parseResult.error.message}`
      this.logger.error(new Error(message), 'Event validation failed')
      throw new Error(message)
    }
    return parseResult.data
  }

  private async handleUserMessage(event: AgentMessageUserEvent): Promise<void> {
    try {
      // Tenant context already set by withTenantContext wrapper
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
      const enrichedError = new WorkerProcessingError(
        `Failed to store user message: ${error instanceof Error ? error.message : String(error)}`,
        {
          processor: 'MessageStoreProcessor',
          eventType: 'agent.message.user',
          workflowId: event.workflowId,
          sessionId: event.sessionId,
          orgId: event.metadata?.orgId,
          projectId: event.metadata?.projectId,
          originalError: error instanceof Error ? error : undefined,
        }
      )

      this.logger.error(
        enrichedError,
        `Message store failed: eventType=agent.message.user workflowId=${event.workflowId} sessionId=${event.sessionId} orgId=${event.metadata?.orgId} projectId=${event.metadata?.projectId}`
      )
      // Throw to trigger retry logic in event bus
      throw enrichedError
    }
  }

  private async handleCompleteMessage(event: AgentMessageCompleteEvent): Promise<void> {
    try {
      // Tenant context already set by withTenantContext wrapper
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
      const enrichedError = new WorkerProcessingError(
        `Failed to store message: ${error instanceof Error ? error.message : String(error)}`,
        {
          processor: 'MessageStoreProcessor',
          eventType: 'agent.message.complete',
          workflowId: event.workflowId,
          sessionId: event.sessionId,
          messageId: event.messageId,
          orgId: event.metadata?.orgId,
          projectId: event.metadata?.projectId,
          originalError: error instanceof Error ? error : undefined,
        }
      )

      this.logger.error(
        enrichedError,
        `Message store failed: eventType=agent.message.complete workflowId=${event.workflowId} sessionId=${event.sessionId} messageId=${event.messageId} orgId=${event.metadata?.orgId} projectId=${event.metadata?.projectId}`
      )
      // Throw to trigger retry logic in event bus
      throw enrichedError
    }
  }
}
