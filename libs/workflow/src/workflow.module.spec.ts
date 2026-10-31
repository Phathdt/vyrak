/**
 * @vitest-environment node
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CustomConfigService } from '@vyrak/custom-config'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { WorkflowBrainstormingService, WorkflowService } from './application'
import {
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WORKFLOW_SERVICE,
  WorkflowPrismaRepository,
  WorkflowRepositoryPrismaRepository,
} from './infras'
import { WorkflowModule } from './workflow.module'

describe('WorkflowModule', () => {
  let module: TestingModule

  const createMockProviders = () => ({
    PrismaService: {
      client: {
        workflow: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        workflowRepository: {
          findMany: vi.fn(),
          create: vi.fn(),
          createMany: vi.fn(),
          delete: vi.fn(),
        },
      },
    },
    ConversationService: {
      getOrCreateSession: vi.fn(),
      addMessage: vi.fn(),
      getMessages: vi.fn(),
      getMessageCount: vi.fn(),
      canClassify: vi.fn(),
      getSessionWithMessages: vi.fn(),
      completeSession: vi.fn(),
    },
    AIAgentService: {
      chat: vi.fn(),
      chatStream: vi.fn(),
      classifyWorkflow: vi.fn(),
    },
    ClaudeAdapter: vi.fn(),
    CustomConfigService: {
      anthropic: {
        apiKey: 'test-api-key',
        apiUrl: undefined,
        model: 'claude-sonnet-4-20250514',
      },
    },
  })

  afterEach(async () => {
    if (module) {
      await module.close()
    }
  })

  describe('module compilation', () => {
    it('should compile the module', async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()

      expect(module).toBeDefined()
    })

    it('should have WorkflowModule defined', () => {
      expect(WorkflowModule).toBeDefined()
    })
  })

  describe('provider registration', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()
    })

    it('should register WorkflowBrainstormingService', () => {
      const service = module.get(WorkflowBrainstormingService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(WorkflowBrainstormingService)
    })

    it('should register WORKFLOW_REPOSITORY token', () => {
      const repository = module.get(WORKFLOW_REPOSITORY)
      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(WorkflowPrismaRepository)
    })

    it('should register WORKFLOW_REPOSITORY_REPOSITORY token', () => {
      const repository = module.get(WORKFLOW_REPOSITORY_REPOSITORY)
      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(WorkflowRepositoryPrismaRepository)
    })

    it('should register WORKFLOW_SERVICE token', () => {
      const service = module.get(WORKFLOW_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(WorkflowService)
    })
  })

  describe('dependency injection', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()
    })

    it('should inject repositories into WORKFLOW_SERVICE factory', () => {
      const service = module.get(WORKFLOW_SERVICE)
      const workflowRepository = module.get(WORKFLOW_REPOSITORY)
      const repositoryRepo = module.get(WORKFLOW_REPOSITORY_REPOSITORY)

      expect(service).toBeDefined()
      expect(workflowRepository).toBeDefined()
      expect(repositoryRepo).toBeDefined()
    })

    it('should create singleton instances', () => {
      const service1 = module.get(WORKFLOW_SERVICE)
      const service2 = module.get(WORKFLOW_SERVICE)

      expect(service1).toBe(service2)
    })
  })

  describe('module exports', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()
    })

    it('should export WORKFLOW_SERVICE token', () => {
      const service = module.get(WORKFLOW_SERVICE)
      expect(service).toBeDefined()
    })

    it('should export WorkflowBrainstormingService', () => {
      const service = module.get(WorkflowBrainstormingService)
      expect(service).toBeDefined()
    })
  })

  describe('token bindings', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()
    })

    it('should bind WORKFLOW_REPOSITORY token', () => {
      const provider = module.get(WORKFLOW_REPOSITORY)
      expect(provider).toBeDefined()
      expect(typeof WORKFLOW_REPOSITORY).toBe('symbol')
    })

    it('should bind WORKFLOW_REPOSITORY_REPOSITORY token', () => {
      const provider = module.get(WORKFLOW_REPOSITORY_REPOSITORY)
      expect(provider).toBeDefined()
      expect(typeof WORKFLOW_REPOSITORY_REPOSITORY).toBe('symbol')
    })

    it('should bind WORKFLOW_SERVICE token', () => {
      const provider = module.get(WORKFLOW_SERVICE)
      expect(provider).toBeDefined()
      expect(typeof WORKFLOW_SERVICE).toBe('symbol')
    })

    it('should provide distinct token instances', () => {
      const repo1 = module.get(WORKFLOW_REPOSITORY)
      const repo2 = module.get(WORKFLOW_REPOSITORY_REPOSITORY)
      const svc = module.get(WORKFLOW_SERVICE)

      expect(repo1).not.toBe(repo2)
      expect(repo1).not.toBe(svc)
      expect(repo2).not.toBe(svc)
    })
  })

  describe('factory provider', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()
    })

    it('should use factory to create WORKFLOW_SERVICE', () => {
      const service = module.get(WORKFLOW_SERVICE)
      expect(service).toBeInstanceOf(WorkflowService)
    })

    it('should pass injected dependencies to factory', () => {
      const service = module.get(WORKFLOW_SERVICE)
      const repo1 = module.get(WORKFLOW_REPOSITORY)
      const repo2 = module.get(WORKFLOW_REPOSITORY_REPOSITORY)

      expect(service).toBeDefined()
      expect(repo1).toBeDefined()
      expect(repo2).toBeDefined()
    })
  })

  describe('module as import', () => {
    it('should be importable by other modules', async () => {
      const mocks = createMockProviders()
      const testModule = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()

      expect(testModule).toBeDefined()

      const service = testModule.get(WORKFLOW_SERVICE)
      const brainstorming = testModule.get(WorkflowBrainstormingService)

      expect(service).toBeDefined()
      expect(brainstorming).toBeDefined()

      await testModule.close()
    })

    it('should maintain module isolation', async () => {
      const mocks1 = createMockProviders()
      const mocks2 = createMockProviders()

      const mod1 = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks1.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks1.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks1.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks1.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks1.CustomConfigService)
        .compile()

      const mod2 = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks2.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks2.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks2.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks2.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks1.CustomConfigService)
        .compile()

      const svc1 = mod1.get(WORKFLOW_SERVICE)
      const svc2 = mod2.get(WORKFLOW_SERVICE)

      expect(svc1).not.toBe(svc2)

      await mod1.close()
      await mod2.close()
    })
  })

  describe('coverage for initialization', () => {
    it('should initialize module with all providers', async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()

      const providers = [
        WorkflowBrainstormingService,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        WORKFLOW_SERVICE,
      ]

      for (const provider of providers) {
        const instance = module.get(provider)
        expect(instance).toBeDefined()
      }
    })

    it('should handle module lifecycle', async () => {
      const mocks = createMockProviders()
      const testModule = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('PrismaService')
        .useValue(mocks.PrismaService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider('ClaudeAdapter')
        .useValue(mocks.ClaudeAdapter)
        .overrideProvider(CustomConfigService)
        .useValue(mocks.CustomConfigService)
        .compile()

      expect(testModule).toBeDefined()
      await expect(testModule.close()).resolves.toBeUndefined()
    })
  })
})
