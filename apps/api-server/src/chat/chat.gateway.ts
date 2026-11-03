import { Inject, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { IConversationService, CONVERSATION_SERVICE, ConversationPhase } from '@vyrak/conversation'
import { IConfigService, CONFIG_SERVICE } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { IEventBus, EVENT_BUS, EventType } from '@vyrak/event-bus'
import { IWorkflowRepository, WORKFLOW_REPOSITORY } from '@vyrak/workflow-core'
import { Server as SocketIOServer, Socket } from 'socket.io'

import { ChatService } from './chat.service'
import { ChatMessageDto } from './dto/chat-message.dto'
import { JoinWorkflowDto } from './dto/join-workflow.dto'
import { TypingEventDto } from './dto/typing-event.dto'
import { WsAuthGuard } from './guards/ws-auth.guard'

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // SECURITY: Whitelist allowed origins only (CRITICAL FIX)
      const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(
        Boolean
      )

      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`[ChatGateway] Blocked CORS request from unauthorized origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: SocketIOServer

  private readonly model: string

  constructor(
    private readonly chatService: ChatService,
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CONFIG_SERVICE) private readonly configService: IConfigService,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepository: IWorkflowRepository,
    private readonly databaseService: DatabaseService,
    private readonly logger: EnhancedLogger
  ) {
    const anthropicConfig = this.configService.anthropic
    if (!anthropicConfig?.model) {
      throw new Error('ANTHROPIC__MODEL not configured in .env')
    }
    this.model = anthropicConfig.model
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Auth handled by WsAuthGuard
      const userId = client.data.userId

      // Join personal room
      client.join(`user:${userId}`)

      this.logger.log(`User ${userId} connected`, 'ChatGateway')
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Connection failed', 'ChatGateway')
      client.disconnect()
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId
    this.logger.log(`User ${userId} disconnected`, 'ChatGateway')
  }

  @SubscribeMessage('chat:join')
  async handleJoinWorkflow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinWorkflowDto
  ): Promise<{ success: boolean }> {
    const userId = client.data.userId
    const orgId = client.data.orgId // Get orgId from socket context
    const { workflowId } = data

    try {
      // Set tenant context before any DB operations
      this.databaseService.setTenantContext(orgId)

      // Check access
      const hasAccess = await this.chatService.checkWorkflowAccess(workflowId, userId)

      if (!hasAccess) {
        client.emit('error', { message: 'Access denied' })
        return { success: false }
      }

      // Join workflow room
      client.join(`workflow:${workflowId}`)

      // Notify others
      client.to(`workflow:${workflowId}`).emit('user:joined', { userId })

      this.logger.log(`User ${userId} joined workflow ${workflowId}`, 'ChatGateway')

      return { success: true }
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Join workflow error', 'ChatGateway')
      client.emit('error', { message: 'Failed to join workflow' })
      return { success: false }
    }
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @SubscribeMessage('chat:send')
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: ChatMessageDto): Promise<void> {
    const userId = client.data.userId
    const orgId = client.data.orgId // Get orgId from socket context (set by WsAuthGuard)
    const { workflowId, message, projectId, idempotencyKey } = data

    try {
      // Set tenant context for database operations (WebSocket doesn't use HTTP interceptor)
      this.databaseService.setTenantContext(orgId)

      // Check idempotency - use eventId field for deduplication
      if (idempotencyKey) {
        const existingMessage = await this.conversationService.findMessageByEventId(idempotencyKey)
        if (existingMessage) {
          this.logger.log(`Duplicate message detected: ${idempotencyKey}`, 'ChatGateway')
          client.emit('chat:complete', {
            messageId: existingMessage.id,
            content: existingMessage.content,
          })
          return
        }
      }

      // Check access
      const hasAccess = await this.chatService.checkWorkflowAccess(workflowId, userId)
      if (!hasAccess) {
        client.emit('chat:error', { message: 'Access denied' })
        return
      }

      // Get workflow to determine current phase
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        client.emit('chat:error', { message: 'Workflow not found' })
        return
      }

      // Map workflow phase key to conversation phase
      const conversationPhase = this.mapWorkflowPhaseToConversationPhase(workflow.currentPhaseKey || 'planning')

      // Get or create session with the current phase (now uses upsert to prevent race conditions)
      const session = await this.conversationService.getOrCreateSession(workflowId, conversationPhase)

      // Save user message to database immediately
      const userMessage = await this.conversationService.addMessage({
        sessionId: session.id,
        role: 'user' as const,
        content: message,
        eventId: idempotencyKey, // Use idempotency key for deduplication
      })

      // Emit user message saved with real message ID
      client.emit('chat:user_message_saved', {
        messageId: userMessage.id,
        content: message,
      })

      // Stream chat events with real orgId and projectId
      const stream = this.chatService.streamChat({
        workflowId,
        sessionId: session.id,
        userId,
        message,
        orgId, // Real value from DTO
        projectId, // Real value from DTO
        model: this.model,
        phase: workflow.currentPhaseKey || 'planning', // Pass current phase for correct system prompt
      })

      let fullResponse = ''
      let assistantMessageId: string | null = null

      this.logger.log(`[ChatGateway] Starting stream processing`, 'ChatGateway')

      for await (const event of stream) {
        this.logger.log(`[ChatGateway] Stream event type: ${event.type}`, 'ChatGateway')

        switch (event.type) {
          case 'thinking':
            client.emit('chat:thinking', { content: event.content })
            break

          case 'delta':
            fullResponse += event.content
            client.emit('chat:delta', { content: event.content })
            this.logger.log(`[ChatGateway] Accumulated response length: ${fullResponse.length}`, 'ChatGateway')
            break

          case 'tool':
            client.emit('chat:tool', { name: event.name, input: event.input })
            break

          case 'complete':
            assistantMessageId = event.messageId
            this.logger.log(`[ChatGateway] Received complete event with messageId: ${assistantMessageId}`, 'ChatGateway')
            // Don't emit chat:complete here - we'll emit it after the loop with fullResponse
            break

          case 'error':
            client.emit('chat:error', { message: event.message })
            break
        }
      }

      this.logger.log(
        `[ChatGateway] Stream loop finished. fullResponse length: ${fullResponse.length}, assistantMessageId: ${assistantMessageId}`,
        'ChatGateway'
      )

      // Stream completed - emit complete event and publish to worker
      if (fullResponse && assistantMessageId) {
        // Emit complete to client with full accumulated response
        client.emit('chat:complete', {
          messageId: assistantMessageId,
          content: fullResponse,
        })

        this.logger.log(`Stream completed, publishing event for worker to save`, 'ChatGateway')

        // Publish message complete event with metadata for worker to save
        await this.eventBus.publish(EventType.AGENT_MESSAGE_COMPLETE, {
          type: EventType.AGENT_MESSAGE_COMPLETE,
          workflowId,
          sessionId: session.id,
          messageId: assistantMessageId,
          content: fullResponse,
          timestamp: Date.now(),
          metadata: {
            orgId, // Include orgId for worker tenant context
            projectId, // Include projectId
          },
        })

        this.logger.log(`Published event for worker to save assistant message`, 'ChatGateway')
      } else {
        this.logger.warn(
          `[ChatGateway] Skipping publish - fullResponse: ${fullResponse.length} chars, assistantMessageId: ${assistantMessageId}`,
          'ChatGateway'
        )
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Chat send error', 'ChatGateway')
      client.emit('chat:error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: TypingEventDto): void {
    const userId = client.data.userId
    const { workflowId } = data

    // Broadcast to room (except sender)
    client.to(`workflow:${workflowId}`).emit('user:typing', {
      userId,
      isTyping: true,
    })
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: TypingEventDto): void {
    const userId = client.data.userId
    const { workflowId } = data

    client.to(`workflow:${workflowId}`).emit('user:typing', {
      userId,
      isTyping: false,
    })
  }

  /**
   * Map workflow phase key to conversation phase
   */
  private mapWorkflowPhaseToConversationPhase(phaseKey: string): ConversationPhase {
    switch (phaseKey) {
      case 'planning':
        return ConversationPhase.PLANNING
      case 'technical-refinement':
        return ConversationPhase.TECHNICAL_REFINEMENT
      case 'implementation':
        return ConversationPhase.IMPLEMENTATION
      case 'code-review':
        return ConversationPhase.REVIEW
      case 'qa':
        return ConversationPhase.TESTING
      default:
        // Default to planning for unknown phases
        return ConversationPhase.PLANNING
    }
  }
}
