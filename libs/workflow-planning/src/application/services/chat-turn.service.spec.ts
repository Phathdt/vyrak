import { describe, expect, it, vi } from 'vitest'

import { ChatTurnService } from './chat-turn.service'

import type { ChatTurnEvent } from './chat-turn.service'
import type { AgentStreamRequest, ChatEvent, IAgentStreamPort } from '@vyrak/ai-agent'
import type { IConversationService } from '@vyrak/conversation'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IWorkflowRepository, RepositoryContextService } from '@vyrak/workflow-core'

const params = {
  workflowId: 'wf-1',
  sessionId: 'session-1',
  message: 'Add a login page',
  phase: 'planning',
}

const workflow = { id: 'wf-1', title: 'Login feature', description: 'Users sign in' }

const history = [
  { role: 'user', content: 'first question' },
  { role: 'assistant', content: 'first answer' },
  { role: 'system', content: 'internal note' },
  { role: 'event', content: 'event payload' },
  { role: 'user', content: 'Add a login page' },
]

/** Agent port fake that replays scripted events and records the request it received. */
function scriptedPort(events: ChatEvent[], failWith?: Error) {
  const requests: AgentStreamRequest[] = []
  const port: IAgentStreamPort = {
    async *stream(request) {
      requests.push(request)
      for (const event of events) {
        yield event
      }
      if (failWith) {
        throw failWith
      }
    },
  }
  return { port, requests }
}

function buildService(
  port: IAgentStreamPort,
  options: { repoPath?: string | null; workflowFound?: boolean; generateId?: () => string } = {}
) {
  const { repoPath = '/repos/org/project/app', workflowFound = true, generateId = () => 'message-id-1' } = options

  const conversationService = { getMessages: vi.fn().mockResolvedValue(history) }
  const workflowRepository = { findById: vi.fn().mockResolvedValue(workflowFound ? workflow : null) }
  const repositoryContext = { resolveRepositoryPath: vi.fn().mockResolvedValue(repoPath) }
  const logger = { log: vi.fn(), error: vi.fn() }

  const service = new ChatTurnService(
    port,
    conversationService as unknown as IConversationService,
    workflowRepository as unknown as IWorkflowRepository,
    repositoryContext as unknown as RepositoryContextService,
    logger as unknown as EnhancedLogger,
    generateId
  )

  return { service, conversationService, workflowRepository, repositoryContext, logger }
}

async function collect(stream: AsyncGenerator<ChatTurnEvent>): Promise<ChatTurnEvent[]> {
  const events: ChatTurnEvent[] = []
  for await (const event of stream) {
    events.push(event)
  }
  return events
}

describe('ChatTurnService', () => {
  describe('event relay', () => {
    it('emits thinking, delta, tool and complete in the order the agent produced them', async () => {
      const { port } = scriptedPort([
        { type: 'thinking', content: 'thinking...' },
        { type: 'delta', content: 'Hello ' },
        { type: 'tool', name: 'Write', input: { file_path: 'docs/prd.md' } },
        { type: 'delta', content: 'world' },
        { type: 'complete', content: 'Hello world' },
      ])
      const { service } = buildService(port)

      const events = await collect(service.run(params))

      expect(events.map((event) => event.type)).toEqual(['thinking', 'delta', 'tool', 'delta', 'complete'])
    })

    it('attaches the generated messageId and full content to the complete event', async () => {
      const { port } = scriptedPort([
        { type: 'delta', content: 'Hello world' },
        { type: 'complete', content: 'Hello world' },
      ])
      const { service } = buildService(port, { generateId: () => 'generated-id' })

      const events = await collect(service.run(params))

      expect(events.at(-1)).toEqual({ type: 'complete', content: 'Hello world', messageId: 'generated-id' })
    })

    it('adds the repository path to tool events', async () => {
      const { port } = scriptedPort([{ type: 'tool', name: 'Edit', input: { file_path: 'a.ts' } }])
      const { service } = buildService(port, { repoPath: '/repos/acme/app' })

      const events = await collect(service.run(params))

      expect(events).toEqual([
        { type: 'tool', name: 'Edit', input: { file_path: 'a.ts' }, repoPath: '/repos/acme/app' },
      ])
    })

    it('does not emit complete when the agent wrote nothing', async () => {
      const { port } = scriptedPort([{ type: 'thinking', content: 'thinking...' }])
      const { service } = buildService(port)

      const events = await collect(service.run(params))

      expect(events.map((event) => event.type)).toEqual(['thinking'])
    })
  })

  describe('agent request', () => {
    it('runs the agent inside the resolved repository with the editing tools', async () => {
      const { port, requests } = scriptedPort([])
      const { service, repositoryContext } = buildService(port, { repoPath: '/repos/acme/app' })

      await collect(service.run(params))

      expect(repositoryContext.resolveRepositoryPath).toHaveBeenCalledWith('wf-1')
      expect(requests).toHaveLength(1)
      expect(requests[0].workingDirectory).toBe('/repos/acme/app')
      expect(requests[0].allowedTools).toEqual(['Read', 'Glob', 'Grep', 'Write', 'Edit'])
      expect(requests[0].maxTurns).toBe(20)
    })

    it('builds the prompt from the phase prompt, user and assistant history, and the latest message', async () => {
      const { port, requests } = scriptedPort([])
      const { service, conversationService } = buildService(port)

      await collect(service.run(params))

      const prompt = requests[0].prompt
      expect(conversationService.getMessages).toHaveBeenCalledWith('session-1')
      expect(prompt).toContain('Product Discovery Manager')
      expect(prompt).toContain('Title: Login feature')
      expect(prompt).toContain('user: first question\n\nassistant: first answer\n\nuser: Add a login page')
      expect(prompt).not.toContain('internal note')
      expect(prompt).not.toContain('event payload')
      expect(prompt).toContain("User's latest message: Add a login page")
    })

    it('uses the architect prompt for technical-refinement', async () => {
      const { port, requests } = scriptedPort([])
      const { service } = buildService(port)

      await collect(service.run({ ...params, phase: 'technical-refinement' }))

      expect(requests[0].prompt).toContain('Senior Software Architect')
    })

    it('falls back to the planning prompt for other phases', async () => {
      const { port, requests } = scriptedPort([])
      const { service } = buildService(port)

      await collect(service.run({ ...params, phase: 'qa' }))

      expect(requests[0].prompt).toContain('Product Discovery Manager')
    })
  })

  describe('failures', () => {
    it('reports a missing repository without calling the agent', async () => {
      const { port, requests } = scriptedPort([])
      const { service } = buildService(port, { repoPath: null })

      const events = await collect(service.run(params))

      expect(events).toEqual([{ type: 'error', message: 'No repository linked' }])
      expect(requests).toHaveLength(0)
    })

    it('reports a missing workflow without calling the agent', async () => {
      const { port, requests } = scriptedPort([])
      const { service } = buildService(port, { workflowFound: false })

      const events = await collect(service.run(params))

      expect(events).toEqual([{ type: 'error', message: 'Workflow not found' }])
      expect(requests).toHaveLength(0)
    })

    it('forwards events produced before an agent failure, then reports the error and logs it', async () => {
      const { port } = scriptedPort([{ type: 'delta', content: 'partial' }], new Error('SDK crashed'))
      const { service, logger } = buildService(port)

      const events = await collect(service.run(params))

      expect(events).toEqual([
        { type: 'delta', content: 'partial' },
        { type: 'error', message: 'SDK crashed' },
      ])
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('reports non-Error throwables as an unknown error', async () => {
      const port: IAgentStreamPort = {
        // eslint-disable-next-line require-yield -- the fake only needs to throw
        async *stream() {
          throw 'boom'
        },
      }
      const { service } = buildService(port)

      const events = await collect(service.run(params))

      expect(events).toEqual([{ type: 'error', message: 'Unknown error' }])
    })

    it('passes through an error event emitted by the agent port', async () => {
      const { port } = scriptedPort([{ type: 'error', message: 'rate limited' }])
      const { service } = buildService(port)

      const events = await collect(service.run(params))

      expect(events).toEqual([{ type: 'error', message: 'rate limited' }])
    })
  })
})
