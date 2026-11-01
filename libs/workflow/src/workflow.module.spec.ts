/**
 * @vitest-environment node
 */

import { Test, TestingModule } from '@nestjs/testing'
import { CustomConfigService } from '@vyrak/custom-config'
import { GitRepositoryService } from '@vyrak/project'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  WorkflowBrainstormingService,
  WorkflowPhaseService,
  WorkflowPlanningService,
  WorkflowService,
} from './application'
import {
  WORKFLOW_BRAINSTORMING_SERVICE,
  WORKFLOW_PHASE_REPOSITORY,
  WORKFLOW_PHASE_SERVICE,
  WORKFLOW_PLANNING_SERVICE,
  WORKFLOW_REPOSITORY,
  WORKFLOW_REPOSITORY_REPOSITORY,
  WORKFLOW_SERVICE,
  WorkflowPhasePrismaRepository,
  WorkflowPrismaRepository,
  WorkflowRepositoryPrismaRepository,
} from './infras'
import { WorkflowModule } from './workflow.module'

const mockCustomConfigService = {
  anthropic: {
    apiKey: 'test-api-key',
    apiUrl: undefined,
    model: 'claude-sonnet-4-20250514',
  },
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  s3: {
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    forcePathStyle: true,
  },
  log: {
    level: 'info',
    enableJsonFormat: false,
  },
}

describe('WorkflowModule', () => {
  let module: TestingModule

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DATABASE__URL = 'postgresql://test:test@localhost:5432/test'
    process.env.REDIS__URL = 'redis://localhost:6379'
    process.env.S3__ENDPOINT = 'http://localhost:4566'
    process.env.S3__ACCESS_KEY_ID = 'test'
    process.env.S3__SECRET_ACCESS_KEY = 'test'
  })

  const createMockProviders = () => ({
    DatabaseService: {
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
        workflowPhase: {
          findMany: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
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
    GitRepositoryService: {
      cloneRepository: vi.fn(),
      createBranch: vi.fn(),
      pushBranch: vi.fn(),
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
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
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
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
        .compile()
    })

    it('should register WORKFLOW_BRAINSTORMING_SERVICE token', () => {
      const service = module.get(WORKFLOW_BRAINSTORMING_SERVICE)
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

    it('should register WORKFLOW_PHASE_REPOSITORY token', () => {
      const repository = module.get(WORKFLOW_PHASE_REPOSITORY)
      expect(repository).toBeDefined()
      expect(repository).toBeInstanceOf(WorkflowPhasePrismaRepository)
    })

    it('should register WORKFLOW_PHASE_SERVICE token', () => {
      const service = module.get(WORKFLOW_PHASE_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(WorkflowPhaseService)
    })

    it('should register WORKFLOW_PLANNING_SERVICE token', () => {
      const service = module.get(WORKFLOW_PLANNING_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(WorkflowPlanningService)
    })
  })

  describe('dependency injection', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
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

    it('should inject all dependencies for WORKFLOW_PLANNING_SERVICE', () => {
      const service = module.get(WORKFLOW_PLANNING_SERVICE)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(WorkflowPlanningService)
    })
  })

  describe('module exports', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
        .compile()
    })

    it('should export WORKFLOW_SERVICE token', () => {
      const service = module.get(WORKFLOW_SERVICE)
      expect(service).toBeDefined()
    })

    it('should export WORKFLOW_BRAINSTORMING_SERVICE token', () => {
      const service = module.get(WORKFLOW_BRAINSTORMING_SERVICE)
      expect(service).toBeDefined()
    })

    it('should export WORKFLOW_PHASE_SERVICE token', () => {
      const service = module.get(WORKFLOW_PHASE_SERVICE)
      expect(service).toBeDefined()
    })

    it('should export WORKFLOW_PLANNING_SERVICE token', () => {
      const service = module.get(WORKFLOW_PLANNING_SERVICE)
      expect(service).toBeDefined()
    })
  })

  describe('token bindings', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
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

    it('should bind WORKFLOW_PHASE_REPOSITORY token', () => {
      const provider = module.get(WORKFLOW_PHASE_REPOSITORY)
      expect(provider).toBeDefined()
      expect(typeof WORKFLOW_PHASE_REPOSITORY).toBe('symbol')
    })

    it('should bind WORKFLOW_PHASE_SERVICE token', () => {
      const provider = module.get(WORKFLOW_PHASE_SERVICE)
      expect(provider).toBeDefined()
      expect(typeof WORKFLOW_PHASE_SERVICE).toBe('symbol')
    })
  })

  describe('factory provider', () => {
    beforeEach(async () => {
      const mocks = createMockProviders()
      module = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
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

    it('should use factory to create WORKFLOW_BRAINSTORMING_SERVICE', () => {
      const service = module.get(WORKFLOW_BRAINSTORMING_SERVICE)
      expect(service).toBeInstanceOf(WorkflowBrainstormingService)
    })

    it('should use factory to create WORKFLOW_PLANNING_SERVICE', () => {
      const service = module.get(WORKFLOW_PLANNING_SERVICE)
      expect(service).toBeInstanceOf(WorkflowPlanningService)
    })

    it('should use factory to create WORKFLOW_PHASE_SERVICE', () => {
      const service = module.get(WORKFLOW_PHASE_SERVICE)
      expect(service).toBeInstanceOf(WorkflowPhaseService)
    })
  })

  describe('module as import', () => {
    it('should be importable by other modules', async () => {
      const mocks = createMockProviders()
      const testModule = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .compile()

      expect(testModule).toBeDefined()

      const service = testModule.get(WORKFLOW_SERVICE)
      const brainstorming = testModule.get(WORKFLOW_BRAINSTORMING_SERVICE)

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
        .overrideProvider('DatabaseService')
        .useValue(mocks1.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks1.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks1.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks1.GitRepositoryService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .compile()

      const mod2 = await Test.createTestingModule({
        imports: [WorkflowModule],
      })
        .overrideProvider('DatabaseService')
        .useValue(mocks2.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks2.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks2.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks2.GitRepositoryService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
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
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
        .compile()

      const providers = [
        WORKFLOW_BRAINSTORMING_SERVICE,
        WORKFLOW_REPOSITORY,
        WORKFLOW_REPOSITORY_REPOSITORY,
        WORKFLOW_SERVICE,
        WORKFLOW_PHASE_REPOSITORY,
        WORKFLOW_PHASE_SERVICE,
        WORKFLOW_PLANNING_SERVICE,
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
        .overrideProvider('DatabaseService')
        .useValue(mocks.DatabaseService)
        .overrideProvider('ConversationService')
        .useValue(mocks.ConversationService)
        .overrideProvider('AIAgentService')
        .useValue(mocks.AIAgentService)
        .overrideProvider(GitRepositoryService)
        .useValue(mocks.GitRepositoryService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .compile()

      expect(testModule).toBeDefined()
      await expect(testModule.close()).resolves.toBeUndefined()
    })
  })
})
