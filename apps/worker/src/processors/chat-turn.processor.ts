import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject } from '@nestjs/common'
import { CONFIG_SERVICE } from '@vyrak/custom-config'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { EVENT_BUS, EventType } from '@vyrak/event-bus'
import {
  CHAT_TURN_MAX_WAIT_MS,
  CHAT_TURN_QUEUE,
  CHAT_TURN_SERVICE,
  ChatTurnJobSchema,
  ChatTurnService,
} from '@vyrak/workflow-planning'
import { Job } from 'bullmq'

import { SOCKET_EMITTER } from '../realtime/socket-emitter.provider'

import type { ISocketEmitter } from '../realtime/socket-emitter.provider'
import type { OnApplicationBootstrap } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import type { IEventBus } from '@vyrak/event-bus'
import type { ChatTurnEvent, ChatTurnJob } from '@vyrak/workflow-planning'

const WORKER_TIMEOUT_MESSAGE = 'Hết thời gian chờ worker'

/**
 * Runs one chat turn per job and streams the events straight to the socket that sent the message.
 * Event names and payload shapes match what the web client already consumes.
 */
@Processor(CHAT_TURN_QUEUE)
export class ChatTurnProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger: EnhancedLogger

  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CHAT_TURN_SERVICE) private readonly chatTurnService: ChatTurnService,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(SOCKET_EMITTER) private readonly emitter: ISocketEmitter,
    @Inject(CONFIG_SERVICE) private readonly configService: IConfigService,
    enhancedLogger: EnhancedLogger
  ) {
    super()
    this.logger = enhancedLogger.with({ context: 'ChatTurnProcessor' })
  }

  /** Concurrency comes from config, which the static @Processor options cannot read. */
  onApplicationBootstrap(): void {
    this.worker.concurrency = this.configService.worker.chatConcurrency
    this.logger.log(`Chat turn concurrency: ${this.configService.worker.chatConcurrency}`)
  }

  /** Never throws for a failed turn: the queue uses `attempts: 1`, so the client gets chat:error instead. */
  async process(job: Job): Promise<void> {
    const parsed = ChatTurnJobSchema.safeParse(job.data)
    if (!parsed.success) {
      this.logger.error(new Error(`Invalid chat-turn job: ${parsed.error.message}`), 'Job validation failed')
      return
    }
    const data = parsed.data

    try {
      if (Date.now() - data.enqueuedAt > CHAT_TURN_MAX_WAIT_MS) {
        this.logger.warn(`Chat turn expired in queue: job=${job.id} workflowId=${data.workflowId}`)
        this.emit(data, 'chat:error', { message: WORKER_TIMEOUT_MESSAGE })
        return
      }

      await this.databaseService.withOrganization(data.orgId, () => this.runTurn(data))
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error(err, `Chat turn failed: job=${job.id} workflowId=${data.workflowId}`)
      this.emit(data, 'chat:error', { message: err.message })
    }
  }

  private async runTurn(data: ChatTurnJob): Promise<void> {
    const stream = this.chatTurnService.run({
      workflowId: data.workflowId,
      sessionId: data.sessionId,
      message: data.message,
      phase: data.phase,
    })

    for await (const event of stream) {
      await this.relay(data, event)
    }
  }

  private async relay(data: ChatTurnJob, event: ChatTurnEvent): Promise<void> {
    switch (event.type) {
      case 'thinking':
        this.emit(data, 'chat:thinking', { content: event.content })
        break

      case 'delta':
        this.emit(data, 'chat:delta', { content: event.content })
        await this.publishBestEffort(EventType.AGENT_MESSAGE_DELTA, {
          type: EventType.AGENT_MESSAGE_DELTA,
          workflowId: data.workflowId,
          sessionId: data.sessionId,
          content: event.content,
          timestamp: Date.now(),
        })
        break

      case 'tool':
        this.emit(data, 'chat:tool', { name: event.name, input: event.input })
        await this.publishToolUse(data, event)
        break

      case 'complete':
        this.emit(data, 'chat:complete', { messageId: event.messageId, content: event.content })
        await this.eventBus.publish(EventType.AGENT_MESSAGE_COMPLETE, {
          type: EventType.AGENT_MESSAGE_COMPLETE,
          workflowId: data.workflowId,
          sessionId: data.sessionId,
          messageId: event.messageId,
          content: event.content,
          timestamp: Date.now(),
          metadata: { orgId: data.orgId, projectId: data.projectId },
        })
        break

      case 'error':
        this.emit(data, 'chat:error', { message: event.message })
        break
    }
  }

  private async publishToolUse(data: ChatTurnJob, event: Extract<ChatTurnEvent, { type: 'tool' }>): Promise<void> {
    if (event.name !== 'Write' && event.name !== 'Edit') {
      return
    }
    const input = event.input as Record<string, unknown> | null
    const filePath = input?.file_path ?? input?.path
    if (typeof filePath !== 'string') {
      return
    }

    await this.publishBestEffort(EventType.AGENT_TOOL_USE, {
      type: EventType.AGENT_TOOL_USE,
      workflowId: data.workflowId,
      toolName: event.name,
      toolInput: input,
      metadata: { repoPath: event.repoPath, orgId: data.orgId, projectId: data.projectId },
      timestamp: Date.now(),
    })
  }

  /** Delta and tool-use events feed artifact creation; losing one must not break the chat stream. */
  private async publishBestEffort(eventType: string, payload: unknown): Promise<void> {
    try {
      await this.eventBus.publish(eventType, payload)
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), `Failed to publish ${eventType}`)
    }
  }

  private emit(data: ChatTurnJob, event: string, payload: unknown): void {
    this.emitter.emitToSocket(data.socketId, event, payload)
  }
}
