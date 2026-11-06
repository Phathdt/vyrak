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
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { IWorkflowRepository, WORKFLOW_REPOSITORY } from '@vyrak/workflow-core'
import { Server as SocketIOServer, Socket } from 'socket.io'

import { BullChatTurnPublisher } from './chat-turn.publisher'
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

  constructor(
    private readonly chatTurnPublisher: BullChatTurnPublisher,
    @Inject(CONVERSATION_SERVICE) private readonly conversationService: IConversationService,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepository: IWorkflowRepository,
    private readonly databaseService: DatabaseService,
    private readonly logger: EnhancedLogger
  ) {}

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
      const hasAccess = await this.checkWorkflowAccess(workflowId, userId)

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
      const hasAccess = await this.checkWorkflowAccess(workflowId, userId)
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

      // The worker runs the agent and streams chat:* events back to this socket through Redis
      await this.chatTurnPublisher.enqueueChatTurn({
        socketId: client.id,
        workflowId,
        sessionId: session.id,
        userId,
        orgId,
        projectId,
        phase: workflow.currentPhaseKey || 'planning',
        message,
        enqueuedAt: Date.now(),
      })

      this.logger.log(`Chat turn enqueued for workflow ${workflowId}`, 'ChatGateway')
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

  private async checkWorkflowAccess(workflowId: string, userId: string): Promise<boolean> {
    try {
      const workflow = await this.workflowRepository.findById(workflowId)

      if (!workflow) {
        this.logger.warn(`Workflow not found: ${workflowId}`, 'ChatGateway')
        return false
      }

      // TODO: replace with an organization/project membership check
      this.logger.log(
        `Access check for user ${userId} on workflow ${workflowId}: ${workflow.organizationId}`,
        'ChatGateway'
      )

      return true
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), 'Check access error', 'ChatGateway')
      return false
    }
  }
}
