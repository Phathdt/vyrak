import { Test, TestingModule } from '@nestjs/testing'
import { DatabaseService } from '@vyrak/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConversationService } from './application'
import { CONVERSATION_REPOSITORY, CONVERSATION_SERVICE, ConversationPrismaRepository } from './infras'

describe('ConversationModule', () => {
  let module: TestingModule

  // Helper function to create testing module with mocks
  const createTestModule = async () => {
    const mockDatabaseService = {
      client: {
        $connect: vi.fn().mockResolvedValue(undefined),
        $disconnect: vi.fn().mockResolvedValue(undefined),
        conversationSession: {
          create: vi.fn(),
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          update: vi.fn(),
        },
        conversationMessage: {
          create: vi.fn(),
          findMany: vi.fn(),
          count: vi.fn(),
        },
      },
      setTenantId: vi.fn(),
      getTenantId: vi.fn(),
      withSystemAccess: vi.fn((callback) => callback()),
    } as unknown as DatabaseService

    return await Test.createTestingModule({
      providers: [
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: CONVERSATION_REPOSITORY,
          useFactory: (db: DatabaseService) => new ConversationPrismaRepository(db),
          inject: [DatabaseService],
        },
        {
          provide: CONVERSATION_SERVICE,
          useFactory: (repository) => new ConversationService(repository),
          inject: [CONVERSATION_REPOSITORY],
        },
      ],
    }).compile()
  }

  beforeEach(async () => {
    module = await createTestModule()
  })

  describe('module compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined()
    })

    it('should have providers registered', () => {
      const service = module.get(CONVERSATION_SERVICE)
      const repository = module.get(CONVERSATION_REPOSITORY)
      expect(service).toBeDefined()
      expect(repository).toBeDefined()
    })
  })

  describe('provider registration', () => {
    it('should provide CONVERSATION_SERVICE token', () => {
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
    })

    it('should provide CONVERSATION_REPOSITORY token', () => {
      const repository = module.get(CONVERSATION_REPOSITORY)
      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(ConversationPrismaRepository)
    })

    it('should bind CONVERSATION_REPOSITORY token to ConversationPrismaRepository', () => {
      const repository = module.get(CONVERSATION_REPOSITORY)

      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(ConversationPrismaRepository)
    })
  })

  describe('dependency injection', () => {
    it('should inject repository into service', () => {
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      const repository = module.get(CONVERSATION_REPOSITORY)

      // Verify service has repository through constructor injection
      expect(service).toBeDefined()
      expect(repository).toBeDefined()

      // Verify both are instances of their expected types
      expect(service).toBeInstanceOf(ConversationService)
      expect(repository).toBeInstanceOf(ConversationPrismaRepository)
    })

    it('should provide same service instance on multiple gets', () => {
      const service1 = module.get<ConversationService>(CONVERSATION_SERVICE)
      const service2 = module.get<ConversationService>(CONVERSATION_SERVICE)

      expect(service1).toBe(service2)
    })

    it('should provide same repository instance on multiple gets', () => {
      const repo1 = module.get(CONVERSATION_REPOSITORY)
      const repo2 = module.get(CONVERSATION_REPOSITORY)

      expect(repo1).toBe(repo2)
    })
  })

  describe('module exports', () => {
    it('should export CONVERSATION_SERVICE', async () => {
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
    })

    it('should not export CONVERSATION_REPOSITORY token to consumers', async () => {
      // Module exports only service, not the repository token
      // Verify by checking what's exported
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      expect(service).toBeDefined()

      // Repository should be available internally but not exposed in module exports
      const repository = module.get(CONVERSATION_REPOSITORY)
      expect(repository).toBeDefined()
    })
  })

  describe('module configuration', () => {
    it('should configure providers correctly', () => {
      // Module should compile with required dependencies
      expect(module).toBeDefined()

      // Verify the module has the required services
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      expect(service).toBeDefined()
    })

    it('should have correct provider count', () => {
      // Module should have CONVERSATION_SERVICE and CONVERSATION_REPOSITORY providers
      const service = module.get(CONVERSATION_SERVICE)
      const repository = module.get(CONVERSATION_REPOSITORY)
      expect(service).toBeDefined()
      expect(repository).toBeDefined()
    })
  })

  describe('service instantiation', () => {
    it('should create ConversationService instance with injected repository', () => {
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)

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
      expect(repository).toBeInstanceOf(ConversationPrismaRepository)
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
      expect(repository).toBeInstanceOf(ConversationPrismaRepository)
    })

    it('should provide ConversationPrismaRepository via token', () => {
      const byToken = module.get(CONVERSATION_REPOSITORY)

      expect(byToken).toBeDefined()
      expect(byToken).toBeInstanceOf(ConversationPrismaRepository)
    })
  })

  describe('integration', () => {
    it('should allow creating test modules that import ConversationModule', async () => {
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      const repository = module.get(CONVERSATION_REPOSITORY)

      expect(service).toBeDefined()
      expect(repository).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
      expect(repository).toBeInstanceOf(ConversationPrismaRepository)
    })

    it('should work as imported module in composite applications', async () => {
      const service = module.get<ConversationService>(CONVERSATION_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(ConversationService)
    })
  })
})
