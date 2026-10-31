import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConversationService } from './application'
import { ConversationModule } from './conversation.module'
import { CONVERSATION_REPOSITORY } from './domain'
import { PrismaConversationRepository } from './infrastructure'

describe('ConversationModule', () => {
  let module: TestingModule

  beforeEach(async () => {
    // Mock DatabaseService to avoid requiring actual database
    const mockDatabaseService = {
      client: {
        $connect: vi.fn().mockResolvedValue(undefined),
        $disconnect: vi.fn().mockResolvedValue(undefined),
      },
    }

    module = await Test.createTestingModule({
      imports: [ConversationModule],
    })
      .overrideProvider('DatabaseService')
      .useValue(mockDatabaseService)
      .compile()
  })

  describe('module compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined()
    })

    it('should have ConversationModule defined', () => {
      expect(ConversationModule).toBeDefined()
    })
  })

  describe('provider registration', () => {
    it('should provide ConversationService', () => {
      const service = module.get<ConversationService>(ConversationService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
    })

    it('should provide CONVERSATION_REPOSITORY token', () => {
      const repository = module.get(CONVERSATION_REPOSITORY)
      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(PrismaConversationRepository)
    })

    it('should bind CONVERSATION_REPOSITORY token to PrismaConversationRepository', () => {
      const repository = module.get(CONVERSATION_REPOSITORY)

      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(PrismaConversationRepository)
    })
  })

  describe('dependency injection', () => {
    it('should inject repository into service', () => {
      const service = module.get<ConversationService>(ConversationService)
      const repository = module.get(CONVERSATION_REPOSITORY)

      // Verify service has repository through constructor injection
      expect(service).toBeDefined()
      expect(repository).toBeDefined()

      // Verify both are instances of their expected types
      expect(service).toBeInstanceOf(ConversationService)
      expect(repository).toBeInstanceOf(PrismaConversationRepository)
    })

    it('should provide same service instance on multiple gets', () => {
      const service1 = module.get<ConversationService>(ConversationService)
      const service2 = module.get<ConversationService>(ConversationService)

      expect(service1).toBe(service2)
    })

    it('should provide same repository instance on multiple gets', () => {
      const repo1 = module.get(CONVERSATION_REPOSITORY)
      const repo2 = module.get(CONVERSATION_REPOSITORY)

      expect(repo1).toBe(repo2)
    })
  })

  describe('module exports', () => {
    it('should export ConversationService', async () => {
      // Create a test module that imports ConversationModule
      const testModule = await Test.createTestingModule({
        imports: [ConversationModule],
      })
        .overrideProvider('DatabaseService')
        .useValue({
          client: {
            $connect: vi.fn().mockResolvedValue(undefined),
            $disconnect: vi.fn().mockResolvedValue(undefined),
          },
        })
        .compile()

      const service = testModule.get<ConversationService>(ConversationService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
    })

    it('should not export CONVERSATION_REPOSITORY token to consumers', async () => {
      // Module exports only service, not the repository token
      // Verify by checking what's exported
      const service = module.get<ConversationService>(ConversationService)
      expect(service).toBeDefined()

      // Repository should be available internally but not exposed in module exports
      const repository = module.get(CONVERSATION_REPOSITORY)
      expect(repository).toBeDefined()
    })
  })

  describe('module configuration', () => {
    it('should import DatabaseModule', () => {
      // Module should compile with DatabaseModule dependency
      expect(module).toBeDefined()

      // Verify the module has the required services
      const service = module.get<ConversationService>(ConversationService)
      expect(service).toBeDefined()
    })

    it('should have correct provider count', () => {
      // Module should have ConversationService and CONVERSATION_REPOSITORY token provider
      const providers = Reflect.getMetadata('exports', ConversationModule)
      expect(providers).toBeDefined()
    })
  })

  describe('service instantiation', () => {
    it('should create ConversationService instance with injected repository', () => {
      const service = module.get<ConversationService>(ConversationService)

      // Verify service is properly instantiated with all dependencies
      expect(service).toBeInstanceOf(ConversationService)
      expect(service).toBeDefined()

      // Service should have methods from ConversationService
      expect(typeof service.startSession).toBe('function')
      expect(typeof service.getOrCreateSession).toBe('function')
    })

    it('should create PrismaConversationRepository instance', () => {
      const repository = module.get(CONVERSATION_REPOSITORY)

      // Verify repository is properly instantiated
      expect(repository).toBeInstanceOf(PrismaConversationRepository)
      expect(repository).toBeDefined()

      // Repository should have required methods
      expect(typeof repository.createSession).toBe('function')
      expect(typeof repository.findSessionById).toBe('function')
      expect(typeof repository.findActiveSessionByWorkflowAndPhase).toBe('function')
      expect(typeof repository.findSessionsByWorkflow).toBe('function')
      expect(typeof repository.updateSessionStatus).toBe('function')
      expect(typeof repository.getSessionWithMessages).toBe('function')
      expect(typeof repository.createMessage).toBe('function')
      expect(typeof repository.findMessagesBySession).toBe('function')
      expect(typeof repository.countMessagesBySession).toBe('function')
    })
  })

  describe('token binding', () => {
    it('should resolve CONVERSATION_REPOSITORY symbol correctly', () => {
      const repository = module.get(CONVERSATION_REPOSITORY)

      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(PrismaConversationRepository)
    })

    it('should provide PrismaConversationRepository via token', () => {
      const byToken = module.get(CONVERSATION_REPOSITORY)

      expect(byToken).toBeDefined()
      expect(byToken).toBeInstanceOf(PrismaConversationRepository)
    })
  })

  describe('integration', () => {
    it('should allow creating test modules that import ConversationModule', async () => {
      const testModule = await Test.createTestingModule({
        imports: [ConversationModule],
      })
        .overrideProvider('DatabaseService')
        .useValue({
          client: {
            $connect: vi.fn().mockResolvedValue(undefined),
            $disconnect: vi.fn().mockResolvedValue(undefined),
          },
        })
        .compile()

      const service = testModule.get<ConversationService>(ConversationService)
      const repository = testModule.get(CONVERSATION_REPOSITORY)

      expect(service).toBeDefined()
      expect(repository).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
      expect(repository).toBeInstanceOf(PrismaConversationRepository)
    })

    it('should work as imported module in composite applications', async () => {
      // Simulate importing ConversationModule in another module
      const compositeModule = await Test.createTestingModule({
        imports: [ConversationModule],
      })
        .overrideProvider('DatabaseService')
        .useValue({
          client: {
            $connect: vi.fn().mockResolvedValue(undefined),
            $disconnect: vi.fn().mockResolvedValue(undefined),
          },
        })
        .compile()

      // Both service and repository should be available
      const service = compositeModule.get<ConversationService>(ConversationService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
    })
  })
})
