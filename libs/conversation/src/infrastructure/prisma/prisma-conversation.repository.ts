import { Injectable } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'

import type {
  ConversationMessage,
  ConversationPhase,
  ConversationSession,
  ConversationStatus,
  CreateMessageInput,
  CreateSessionInput,
  MessageRole,
  SessionWithMessages,
} from '../../domain/entities/conversation.entity'
import type { IConversationRepository } from '../../domain/repositories/conversation.repository'

@Injectable()
export class PrismaConversationRepository implements IConversationRepository {
  constructor(private readonly db: DatabaseService) {}

  async createSession(input: CreateSessionInput): Promise<ConversationSession> {
    const session = await this.db.client.conversationSession.create({
      data: {
        workflowId: input.workflowId,
        organizationId: '', // Will be set by tenant filter
        phase: input.phase,
        status: 'ACTIVE',
        metadata: (input.metadata ?? {}) as never,
      },
    })

    return this.toDomainSession(session)
  }

  async findSessionById(sessionId: string): Promise<ConversationSession | null> {
    const session = await this.db.client.conversationSession.findUnique({
      where: { id: sessionId },
    })

    return session ? this.toDomainSession(session) : null
  }

  async findActiveSessionByWorkflowAndPhase(workflowId: string, phase: string): Promise<ConversationSession | null> {
    const session = await this.db.client.conversationSession.findFirst({
      where: {
        workflowId,
        phase,
        status: 'ACTIVE',
      },
      orderBy: { startedAt: 'desc' },
    })

    return session ? this.toDomainSession(session) : null
  }

  async findSessionsByWorkflow(workflowId: string): Promise<ConversationSession[]> {
    const sessions = await this.db.client.conversationSession.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
    })

    return sessions.map((s) => this.toDomainSession(s))
  }

  async updateSessionStatus(sessionId: string, status: string, endedAt?: Date): Promise<ConversationSession> {
    const session = await this.db.client.conversationSession.update({
      where: { id: sessionId },
      data: {
        status,
        endedAt,
      },
    })

    return this.toDomainSession(session)
  }

  async getSessionWithMessages(sessionId: string): Promise<SessionWithMessages | null> {
    const session = await this.db.client.conversationSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) return null

    return {
      ...this.toDomainSession(session),
      messages: session.messages.map((m) => this.toDomainMessage(m)),
    }
  }

  async createMessage(input: CreateMessageInput): Promise<ConversationMessage> {
    const message = await this.db.client.conversationMessage.create({
      data: {
        sessionId: input.sessionId,
        organizationId: '', // Will be set by tenant filter
        role: input.role,
        content: input.content,
        metadata: (input.metadata ?? {}) as never,
      },
    })

    return this.toDomainMessage(message)
  }

  async findMessagesBySession(sessionId: string): Promise<ConversationMessage[]> {
    const messages = await this.db.client.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    return messages.map((m) => this.toDomainMessage(m))
  }

  async countMessagesBySession(sessionId: string): Promise<number> {
    return this.db.client.conversationMessage.count({
      where: { sessionId },
    })
  }

  // Mappers
  private toDomainSession(session: {
    id: string
    workflowId: string
    phase: string
    status: string
    metadata: unknown
    startedAt: Date
    endedAt: Date | null
  }): ConversationSession {
    return {
      id: session.id,
      workflowId: session.workflowId,
      phase: session.phase as ConversationPhase,
      status: session.status as ConversationStatus,
      metadata: session.metadata as Record<string, unknown>,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
    }
  }

  private toDomainMessage(message: {
    id: string
    sessionId: string
    role: string
    content: string
    metadata: unknown
    createdAt: Date
  }): ConversationMessage {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role as MessageRole,
      content: message.content,
      metadata: message.metadata as Record<string, unknown>,
      createdAt: message.createdAt,
    }
  }
}
