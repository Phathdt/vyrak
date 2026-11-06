import { EventType } from '@vyrak/event-bus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatTurnProcessor } from './chat-turn.processor'

import type { ISocketEmitter } from '../realtime/socket-emitter.provider'
import type { IConfigService } from '@vyrak/custom-config'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { DatabaseService } from '@vyrak/database'
import type { IEventBus } from '@vyrak/event-bus'
import type { ChatTurnEvent, ChatTurnService } from '@vyrak/workflow-planning'
import type { Job } from 'bullmq'

const NOW = new Date('2026-11-06T00:00:00.000Z').getTime()

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const PROJECT_ID = '22222222-2222-4222-8222-222222222222'
const SESSION_ID = '33333333-3333-4333-8333-333333333333'
const MESSAGE_ID = '44444444-4444-4444-8444-444444444444'

function jobData(overrides: Record<string, unknown> = {}) {
  return {
    socketId: 'socket-abc',
    workflowId: 'wf-1',
    sessionId: SESSION_ID,
    userId: 'user-1',
    orgId: ORG_ID,
    projectId: PROJECT_ID,
    phase: 'planning',
    message: 'Add a login page',
    enqueuedAt: NOW - 1_000,
    ...overrides,
  }
}

function asJob(data: unknown): Job {
  return { id: 'job-1', name: 'chat-turn', data } as unknown as Job
}

function streamOf(events: ChatTurnEvent[], failWith?: unknown): ChatTurnService['run'] {
  return async function* () {
    for (const event of events) {
      yield event
    }
    if (failWith !== undefined) {
      throw failWith
    }
  } as unknown as ChatTurnService['run']
}

function build(options: { events?: ChatTurnEvent[]; failWith?: unknown; chatConcurrency?: number } = {}) {
  const { events = [], failWith, chatConcurrency = 5 } = options

  const emitted: Array<{ socketId: string; event: string; payload: unknown }> = []
  const emitter: ISocketEmitter = {
    emitToSocket: (socketId, event, payload) => {
      emitted.push({ socketId, event, payload })
    },
  }

  const run = vi.fn(streamOf(events, failWith))
  const chatTurnService = { run } as unknown as ChatTurnService

  const publish = vi.fn().mockResolvedValue(undefined)
  const eventBus = { publish } as unknown as IEventBus

  const withOrganization = vi.fn(async (_orgId: string, fn: () => Promise<unknown>) => fn())
  const databaseService = { withOrganization } as unknown as DatabaseService

  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const enhancedLogger = { with: () => logger } as unknown as EnhancedLogger

  const configService = { worker: { chatConcurrency } } as unknown as IConfigService

  const processor = new ChatTurnProcessor(
    databaseService,
    chatTurnService,
    eventBus,
    emitter,
    configService,
    enhancedLogger
  )

  return { processor, emitted, run, publish, withOrganization, logger }
}

describe('ChatTurnProcessor', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('queue wait limit', () => {
    it('emits chat:error to the sender and does not run the turn when the job waited over 120 seconds', async () => {
      const { processor, emitted, run, withOrganization } = build({ events: [{ type: 'delta', content: 'x' }] })

      await processor.process(asJob(jobData({ enqueuedAt: NOW - 120_001 })))

      expect(emitted).toEqual([
        { socketId: 'socket-abc', event: 'chat:error', payload: { message: 'Hết thời gian chờ worker' } },
      ])
      expect(run).not.toHaveBeenCalled()
      expect(withOrganization).not.toHaveBeenCalled()
    })

    it('still runs a job that waited exactly 120 seconds', async () => {
      const { processor, run } = build()

      await processor.process(asJob(jobData({ enqueuedAt: NOW - 120_000 })))

      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  describe('event delivery', () => {
    it('emits every event to the socket that sent the message, in order, with the existing event names and payloads', async () => {
      const { processor, emitted } = build({
        events: [
          { type: 'thinking', content: '🤔 Thinking...' },
          { type: 'delta', content: 'Hello ' },
          { type: 'tool', name: 'Read', input: { file_path: 'a.ts' }, repoPath: '/repos/app' },
          { type: 'delta', content: 'world' },
          { type: 'complete', content: 'Hello world', messageId: MESSAGE_ID },
        ],
      })

      await processor.process(asJob(jobData({ socketId: 'socket-xyz' })))

      expect(emitted.every((item) => item.socketId === 'socket-xyz')).toBe(true)
      expect(emitted.map(({ event, payload }) => ({ event, payload }))).toEqual([
        { event: 'chat:thinking', payload: { content: '🤔 Thinking...' } },
        { event: 'chat:delta', payload: { content: 'Hello ' } },
        { event: 'chat:tool', payload: { name: 'Read', input: { file_path: 'a.ts' } } },
        { event: 'chat:delta', payload: { content: 'world' } },
        { event: 'chat:complete', payload: { messageId: MESSAGE_ID, content: 'Hello world' } },
      ])
    })

    it('forwards an error event from the turn as chat:error', async () => {
      const { processor, emitted } = build({ events: [{ type: 'error', message: 'No repository linked' }] })

      await processor.process(asJob(jobData()))

      expect(emitted).toEqual([
        { socketId: 'socket-abc', event: 'chat:error', payload: { message: 'No repository linked' } },
      ])
    })

    it('runs the turn inside the tenant context of the job organization', async () => {
      const { processor, withOrganization, run } = build()

      await processor.process(asJob(jobData()))

      expect(withOrganization).toHaveBeenCalledWith(ORG_ID, expect.any(Function))
      expect(run).toHaveBeenCalledWith({
        workflowId: 'wf-1',
        sessionId: SESSION_ID,
        message: 'Add a login page',
        phase: 'planning',
      })
    })
  })

  describe('event bus', () => {
    it('publishes AGENT_MESSAGE_DELTA for each delta', async () => {
      const { processor, publish } = build({ events: [{ type: 'delta', content: 'Hello' }] })

      await processor.process(asJob(jobData()))

      expect(publish).toHaveBeenCalledWith(EventType.AGENT_MESSAGE_DELTA, {
        type: EventType.AGENT_MESSAGE_DELTA,
        workflowId: 'wf-1',
        sessionId: SESSION_ID,
        content: 'Hello',
        timestamp: NOW,
      })
    })

    it('publishes AGENT_TOOL_USE with repo path, orgId and projectId for Write and Edit', async () => {
      const { processor, publish } = build({
        events: [
          { type: 'tool', name: 'Write', input: { file_path: 'docs/prd/prd-login.md' }, repoPath: '/repos/app' },
          { type: 'tool', name: 'Edit', input: { path: 'docs/adr/adr-001.md' }, repoPath: '/repos/app' },
        ],
      })

      await processor.process(asJob(jobData()))

      expect(publish).toHaveBeenCalledTimes(2)
      expect(publish).toHaveBeenNthCalledWith(1, EventType.AGENT_TOOL_USE, {
        type: EventType.AGENT_TOOL_USE,
        workflowId: 'wf-1',
        toolName: 'Write',
        toolInput: { file_path: 'docs/prd/prd-login.md' },
        metadata: { repoPath: '/repos/app', orgId: ORG_ID, projectId: PROJECT_ID },
        timestamp: NOW,
      })
      expect(publish).toHaveBeenNthCalledWith(
        2,
        EventType.AGENT_TOOL_USE,
        expect.objectContaining({ toolName: 'Edit', toolInput: { path: 'docs/adr/adr-001.md' } })
      )
    })

    it('does not publish AGENT_TOOL_USE for read-only tools or Write without a file path', async () => {
      const { processor, publish, emitted } = build({
        events: [
          { type: 'tool', name: 'Read', input: { file_path: 'a.ts' }, repoPath: '/repos/app' },
          { type: 'tool', name: 'Write', input: { content: 'x' }, repoPath: '/repos/app' },
        ],
      })

      await processor.process(asJob(jobData()))

      expect(publish).not.toHaveBeenCalled()
      expect(emitted.map((item) => item.event)).toEqual(['chat:tool', 'chat:tool'])
    })

    it('publishes AGENT_MESSAGE_COMPLETE with orgId and projectId metadata after chat:complete', async () => {
      const { processor, publish, emitted } = build({
        events: [{ type: 'complete', content: 'Hello world', messageId: MESSAGE_ID }],
      })

      await processor.process(asJob(jobData()))

      expect(emitted.map((item) => item.event)).toEqual(['chat:complete'])
      expect(publish).toHaveBeenCalledWith(EventType.AGENT_MESSAGE_COMPLETE, {
        type: EventType.AGENT_MESSAGE_COMPLETE,
        workflowId: 'wf-1',
        sessionId: SESSION_ID,
        messageId: MESSAGE_ID,
        content: 'Hello world',
        timestamp: NOW,
        metadata: { orgId: ORG_ID, projectId: PROJECT_ID },
      })
    })

    it('keeps streaming when publishing a delta fails', async () => {
      const { processor, publish, emitted, logger } = build({
        events: [
          { type: 'delta', content: 'a' },
          { type: 'delta', content: 'b' },
        ],
      })
      publish.mockRejectedValue(new Error('redis down'))

      await processor.process(asJob(jobData()))

      expect(emitted.map((item) => item.event)).toEqual(['chat:delta', 'chat:delta'])
      expect(logger.error).toHaveBeenCalledTimes(2)
    })

    it('tells the client when the completed message could not be handed to the saver', async () => {
      const { processor, publish, emitted } = build({
        events: [{ type: 'complete', content: 'Hello', messageId: MESSAGE_ID }],
      })
      publish.mockRejectedValue(new Error('redis down'))

      await expect(processor.process(asJob(jobData()))).resolves.toBeUndefined()

      expect(emitted.map((item) => ({ event: item.event, payload: item.payload }))).toEqual([
        { event: 'chat:complete', payload: { messageId: MESSAGE_ID, content: 'Hello' } },
        { event: 'chat:error', payload: { message: 'redis down' } },
      ])
    })
  })

  describe('failures', () => {
    it('emits chat:error, logs, and does not rethrow when the turn throws', async () => {
      const { processor, emitted, logger } = build({
        events: [{ type: 'delta', content: 'partial' }],
        failWith: new Error('stream exploded'),
      })

      await expect(processor.process(asJob(jobData()))).resolves.toBeUndefined()

      expect(emitted.map((item) => ({ event: item.event, payload: item.payload }))).toEqual([
        { event: 'chat:delta', payload: { content: 'partial' } },
        { event: 'chat:error', payload: { message: 'stream exploded' } },
      ])
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('stringifies non-Error failures', async () => {
      const { processor, emitted } = build({ failWith: 'boom' })

      await processor.process(asJob(jobData()))

      expect(emitted).toEqual([{ socketId: 'socket-abc', event: 'chat:error', payload: { message: 'boom' } }])
    })

    it('logs and ignores a job whose payload fails validation', async () => {
      const { processor, emitted, run, logger } = build()

      await expect(processor.process(asJob({ socketId: 'socket-abc' }))).resolves.toBeUndefined()

      expect(emitted).toEqual([])
      expect(run).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('concurrency', () => {
    it('applies worker.chat_concurrency to the queue worker on bootstrap', () => {
      const { processor } = build({ chatConcurrency: 8 })
      const worker = { concurrency: 1 }
      ;(processor as unknown as { _worker: typeof worker })._worker = worker

      processor.onApplicationBootstrap()

      expect(worker.concurrency).toBe(8)
    })
  })
})
