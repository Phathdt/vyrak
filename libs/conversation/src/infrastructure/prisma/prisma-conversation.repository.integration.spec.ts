import {
  createTestDatabaseService,
  createTestOrgWithOwner,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { PrismaConversationRepository } from './prisma-conversation.repository'

import type { DatabaseService } from '@vyrak/database'

/**
 * Integration tests for PrismaConversationRepository
 * Tests real database operations with PostgreSQL testcontainer
 */
describe('PrismaConversationRepository (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let repository: PrismaConversationRepository
  let setupFailed = false

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)
      repository = new PrismaConversationRepository(databaseService as unknown as DatabaseService)
    } catch (error) {
      setupFailed = true
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  beforeEach(async () => {
    if (setupFailed || !databaseService) return

    const prisma = getPrismaClient()
    // Clean up data
    await prisma.conversationMessage.deleteMany()
    await prisma.conversationSession.deleteMany()
    await prisma.organization.deleteMany()
    await prisma.user.deleteMany()

    resetCounters()
  })

  describe('createSession', () => {
    it('should create a new conversation session', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      // Set tenant context
      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      expect(session).toMatchObject({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
        status: 'ACTIVE',
      })
      expect(session.id).toBeDefined()
      expect(session.startedAt).toBeInstanceOf(Date)
    })

    it('should create session with metadata', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const metadata = { contextId: 'ctx-123', userId: 'user-456' }
      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'PLANNING',
        metadata,
      })

      expect(session.metadata).toEqual(metadata)
    })

    it('should associate session with organization via tenant context', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'IMPLEMENTATION',
      })

      // Verify in database
      const dbSession = await prisma.conversationSession.findUnique({
        where: { id: session.id },
      })

      expect(dbSession).toBeDefined()
      expect(dbSession?.organizationId).toBe(organization.id)
    })
  })

  describe('findSessionById', () => {
    it('should find session by ID', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const created = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const found = await repository.findSessionById(created.id)

      expect(found).toEqual(created)
    })

    it('should return null for non-existent session', async () => {
      if (setupFailed || !databaseService) return

      const result = await repository.findSessionById('nonexistent-id')

      expect(result).toBeNull()
    })
  })

  describe('findActiveSessionByWorkflowAndPhase', () => {
    it('should find active session by workflow and phase', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const created = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const found = await repository.findActiveSessionByWorkflowAndPhase('workflow-1', 'BRAINSTORMING')

      expect(found).toEqual(created)
      expect(found?.status).toBe('ACTIVE')
    })

    it('should not find completed sessions', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      // Mark as completed
      await repository.updateSessionStatus(session.id, 'COMPLETED', new Date())

      const found = await repository.findActiveSessionByWorkflowAndPhase('workflow-1', 'BRAINSTORMING')

      expect(found).toBeNull()
    })

    it('should return null if no session found', async () => {
      if (setupFailed || !databaseService) return

      const result = await repository.findActiveSessionByWorkflowAndPhase('workflow-1', 'PLANNING')

      expect(result).toBeNull()
    })

    it('should return most recent active session if multiple exist', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      // Create first session
      const session1 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      // Add delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Complete first session and create another
      await repository.updateSessionStatus(session1.id, 'COMPLETED', new Date())

      const session2 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const found = await repository.findActiveSessionByWorkflowAndPhase('workflow-1', 'BRAINSTORMING')

      expect(found?.id).toBe(session2.id)
    })
  })

  describe('findSessionsByWorkflow', () => {
    it('should retrieve all sessions for a workflow', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'PLANNING',
      })

      const sessions = await repository.findSessionsByWorkflow('workflow-1')

      expect(sessions).toHaveLength(2)
      expect(sessions.every((s) => s.workflowId === 'workflow-1')).toBe(true)
    })

    it('should return sessions ordered by startedAt descending', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session1 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const session2 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'PLANNING',
      })

      const sessions = await repository.findSessionsByWorkflow('workflow-1')

      expect(sessions[0].id).toBe(session2.id)
      expect(sessions[1].id).toBe(session1.id)
    })

    it('should return empty array for workflow with no sessions', async () => {
      if (setupFailed || !databaseService) return

      const sessions = await repository.findSessionsByWorkflow('workflow-no-sessions')

      expect(sessions).toEqual([])
    })
  })

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const updated = await repository.updateSessionStatus(session.id, 'COMPLETED')

      expect(updated.status).toBe('COMPLETED')
    })

    it('should set endedAt when provided', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const endTime = new Date()
      const updated = await repository.updateSessionStatus(session.id, 'COMPLETED', endTime)

      expect(updated.endedAt).toBeDefined()
      expect(updated.endedAt?.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should handle ARCHIVED status', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const updated = await repository.updateSessionStatus(session.id, 'ARCHIVED')

      expect(updated.status).toBe('ARCHIVED')
    })
  })

  describe('getSessionWithMessages', () => {
    it('should retrieve session with all messages ordered by creation', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      // Add messages
      await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'First message',
      })

      await repository.createMessage({
        sessionId: session.id,
        role: 'assistant',
        content: 'Response',
      })

      const sessionWithMessages = await repository.getSessionWithMessages(session.id)

      expect(sessionWithMessages).toBeDefined()
      expect(sessionWithMessages?.messages).toHaveLength(2)
      expect(sessionWithMessages?.messages[0].content).toBe('First message')
      expect(sessionWithMessages?.messages[1].content).toBe('Response')
    })

    it('should return null for non-existent session', async () => {
      if (setupFailed || !databaseService) return

      const result = await repository.getSessionWithMessages('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should include empty messages array if session has no messages', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const sessionWithMessages = await repository.getSessionWithMessages(session.id)

      expect(sessionWithMessages?.messages).toEqual([])
    })
  })

  describe('createMessage', () => {
    it('should create message in session', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const message = await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'What should we build?',
      })

      expect(message).toMatchObject({
        sessionId: session.id,
        role: 'user',
        content: 'What should we build?',
      })
      expect(message.id).toBeDefined()
      expect(message.createdAt).toBeInstanceOf(Date)
    })

    it('should create message with metadata', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const metadata = { tokens: 150, model: 'claude-3-opus' }
      const message = await repository.createMessage({
        sessionId: session.id,
        role: 'assistant',
        content: 'Response',
        metadata,
      })

      expect(message.metadata).toEqual(metadata)
    })

    it('should associate message with organization via tenant context', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const message = await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'Test',
      })

      // Verify in database
      const dbMessage = await prisma.conversationMessage.findUnique({
        where: { id: message.id },
      })

      expect(dbMessage?.organizationId).toBe(organization.id)
    })

    it('should support all message roles', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const userMsg = await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'User message',
      })

      const assistantMsg = await repository.createMessage({
        sessionId: session.id,
        role: 'assistant',
        content: 'Assistant message',
      })

      const systemMsg = await repository.createMessage({
        sessionId: session.id,
        role: 'system',
        content: 'System message',
      })

      expect(userMsg.role).toBe('user')
      expect(assistantMsg.role).toBe('assistant')
      expect(systemMsg.role).toBe('system')
    })
  })

  describe('findMessagesBySession', () => {
    it('should retrieve messages for a session', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const msg1 = await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'Message 1',
      })

      const msg2 = await repository.createMessage({
        sessionId: session.id,
        role: 'assistant',
        content: 'Message 2',
      })

      const messages = await repository.findMessagesBySession(session.id)

      expect(messages).toHaveLength(2)
      expect(messages[0].id).toBe(msg1.id)
      expect(messages[1].id).toBe(msg2.id)
    })

    it('should return messages ordered by createdAt ascending', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const msg1 = await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'First',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const msg2 = await repository.createMessage({
        sessionId: session.id,
        role: 'assistant',
        content: 'Second',
      })

      const messages = await repository.findMessagesBySession(session.id)

      expect(messages[0].id).toBe(msg1.id)
      expect(messages[1].id).toBe(msg2.id)
    })

    it('should return empty array for session with no messages', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const messages = await repository.findMessagesBySession(session.id)

      expect(messages).toEqual([])
    })
  })

  describe('countMessagesBySession', () => {
    it('should return message count for session', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'Message 1',
      })

      await repository.createMessage({
        sessionId: session.id,
        role: 'assistant',
        content: 'Message 2',
      })

      const count = await repository.countMessagesBySession(session.id)

      expect(count).toBe(2)
    })

    it('should return zero for session with no messages', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      const count = await repository.countMessagesBySession(session.id)

      expect(count).toBe(0)
    })
  })

  describe('Tenant Isolation', () => {
    it('should isolate sessions by organization', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create session in org1
      databaseService.setTenantContext(org1.id)
      const session1 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      // Create session in org2
      databaseService.setTenantContext(org2.id)
      const session2 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      // Verify tenant filter - org1 should only see session1
      databaseService.setTenantContext(org1.id)
      const org1Sessions = await repository.findSessionsByWorkflow('workflow-1')
      expect(org1Sessions).toHaveLength(1)
      expect(org1Sessions[0].id).toBe(session1.id)

      // org2 should only see session2
      databaseService.setTenantContext(org2.id)
      const org2Sessions = await repository.findSessionsByWorkflow('workflow-1')
      expect(org2Sessions).toHaveLength(1)
      expect(org2Sessions[0].id).toBe(session2.id)
    })

    it('should isolate messages by organization', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization: org1 } = await createTestOrgWithOwner(prisma)
      const { organization: org2 } = await createTestOrgWithOwner(prisma)

      // Create sessions and messages in org1
      databaseService.setTenantContext(org1.id)
      const session1 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      await repository.createMessage({
        sessionId: session1.id,
        role: 'user',
        content: 'Org1 message',
      })

      // Create session and message in org2
      databaseService.setTenantContext(org2.id)
      const session2 = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      await repository.createMessage({
        sessionId: session2.id,
        role: 'user',
        content: 'Org2 message',
      })

      // Verify isolation
      databaseService.setTenantContext(org1.id)
      const messages1 = await repository.findMessagesBySession(session1.id)
      expect(messages1).toHaveLength(1)
      expect(messages1[0].content).toBe('Org1 message')

      databaseService.setTenantContext(org2.id)
      const messages2 = await repository.findMessagesBySession(session2.id)
      expect(messages2).toHaveLength(1)
      expect(messages2[0].content).toBe('Org2 message')
    })
  })

  describe('Cascade and Constraints', () => {
    it('should delete messages when session is deleted', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      await repository.createMessage({
        sessionId: session.id,
        role: 'user',
        content: 'Test message',
      })

      // Manually delete session to test cascade
      await prisma.conversationSession.delete({
        where: { id: session.id },
      })

      // Verify messages were deleted
      const messages = await prisma.conversationMessage.findMany({
        where: { sessionId: session.id },
      })

      expect(messages).toHaveLength(0)
    })

    it('should handle large conversations with many messages', async () => {
      if (setupFailed || !databaseService) return

      const prisma = getPrismaClient()
      const { organization } = await createTestOrgWithOwner(prisma)

      databaseService.setTenantContext(organization.id)

      const session = await repository.createSession({
        workflowId: 'workflow-1',
        phase: 'BRAINSTORMING',
      })

      // Create 20 messages
      for (let i = 0; i < 20; i++) {
        await repository.createMessage({
          sessionId: session.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`,
        })
      }

      const count = await repository.countMessagesBySession(session.id)
      expect(count).toBe(20)

      const messages = await repository.findMessagesBySession(session.id)
      expect(messages).toHaveLength(20)
      expect(messages[0].content).toBe('Message 1')
      expect(messages[19].content).toBe('Message 20')
    })
  })
})
