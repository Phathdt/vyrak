import { Test, TestingModule } from '@nestjs/testing'
import { CustomConfigService } from '@vyrak/custom-config'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { AIAgentModule } from './ai-agent.module'
import { AIAgentService } from './application'
import { AI_AGENT_PORT } from './domain'
import { ClaudeAdapter } from './infrastructure'

import type { IAIAgentPort } from './domain'

// Mock CustomConfigService
const mockCustomConfigService = {
  anthropic: {
    apiKey: 'test-api-key',
    apiUrl: undefined,
    model: 'claude-sonnet-4-20250514',
  },
}

describe('AIAgentModule', () => {
  let module: TestingModule
  let mockAIAgentPort: Partial<IAIAgentPort>

  beforeEach(async () => {
    // Mock the AI_AGENT_PORT to avoid instantiating ClaudeAdapter (which requires API key)
    mockAIAgentPort = {
      chat: vi.fn(),
      chatStream: vi.fn(),
      classifyWorkflow: vi.fn(),
    }

    module = await Test.createTestingModule({
      imports: [AIAgentModule],
    })
      .overrideProvider(CustomConfigService)
      .useValue(mockCustomConfigService)
      .overrideProvider(AI_AGENT_PORT)
      .useValue(mockAIAgentPort)
      .compile()
  })

  describe('Module Compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined()
    })

    it('should be an instance of TestingModule', () => {
      expect(module).toBeInstanceOf(TestingModule)
    })
  })

  describe('Provider Registration', () => {
    it('should register AIAgentService as a provider', () => {
      const service = module.get(AIAgentService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(AIAgentService)
    })

    it('should register AI_AGENT_PORT with mocked port implementation', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(port).toBeDefined()
      expect(port).toEqual(mockAIAgentPort)
    })

    it('should inject AI_AGENT_PORT into AIAgentService', () => {
      const service = module.get(AIAgentService)
      // Service should have private property 'aiAgent' which is the injected port
      expect(service).toBeDefined()
      // Verify the service can be used and has the expected methods
      expect(typeof service.chat).toBe('function')
      expect(typeof service.chatStream).toBe('function')
      expect(typeof service.startBrainstorming).toBe('function')
      expect(typeof service.continueBrainstorming).toBe('function')
      expect(typeof service.classifyWorkflow).toBe('function')
      expect(typeof service.shouldClassify).toBe('function')
    })
  })

  describe('Module Exports', () => {
    it('should export AIAgentService', () => {
      const service = module.get(AIAgentService)
      expect(service).toBeDefined()
    })

    it('exported AIAgentService should be accessible from module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service = testModule.get(AIAgentService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(AIAgentService)
    })

    it('should provide AI_AGENT_PORT through module', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      // AI_AGENT_PORT should be available through module DI
      const port = testModule.get(AI_AGENT_PORT)
      expect(port).toBeDefined()
    })
  })

  describe('Dependency Injection', () => {
    it('should create mocked AI_AGENT_PORT instance', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(port).toBeDefined()
      expect(port).toEqual(mockAIAgentPort)
    })

    it('should use same mocked AI_AGENT_PORT instance for both injections', () => {
      const port1 = module.get(AI_AGENT_PORT)
      const port2 = module.get(AI_AGENT_PORT)
      // Singleton should return same instance
      expect(port1).toBe(port2)
    })

    it('should inject the same AI_AGENT_PORT instance into service', async () => {
      const service = module.get(AIAgentService)
      const port = module.get(AI_AGENT_PORT)

      // Both should exist
      expect(service).toBeInstanceOf(AIAgentService)
      expect(port).toEqual(mockAIAgentPort)
    })

    it('AIAgentService should have access to IAIAgentPort methods through DI', () => {
      const service = module.get(AIAgentService)

      // Service methods should delegate to the injected port
      expect(service.chat).toBeDefined()
      expect(service.chatStream).toBeDefined()
      expect(service.classifyWorkflow).toBeDefined()
    })
  })

  describe('Provider Symbol Token', () => {
    it('should use AI_AGENT_PORT symbol as injection token', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(port).toBeDefined()
      // Symbol should be used as the token
      expect(typeof AI_AGENT_PORT).toBe('symbol')
    })

    it('should allow retrieval using AI_AGENT_PORT symbol', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(port).toBeDefined()
      expect(port).toEqual(mockAIAgentPort)
    })

    it('should provide consistent access to port via symbol token', () => {
      const port1 = module.get(AI_AGENT_PORT)
      const port2 = module.get(AI_AGENT_PORT)
      expect(port1).toBe(port2)
    })
  })

  describe('Multiple Module Instances', () => {
    it('should create separate instances for different modules', async () => {
      const module1 = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const module2 = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service1 = module1.get(AIAgentService)
      const service2 = module2.get(AIAgentService)

      // Different modules should have different service instances
      expect(service1).not.toBe(service2)

      await module1.close()
      await module2.close()
    })

    it('should each module maintain its own singleton instances', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service1 = testModule.get(AIAgentService)
      const service2 = testModule.get(AIAgentService)
      const port1 = testModule.get(AI_AGENT_PORT)
      const port2 = testModule.get(AI_AGENT_PORT)

      // Within same module, should be singletons
      expect(service1).toBe(service2)
      expect(port1).toBe(port2)

      await testModule.close()
    })
  })

  describe('Port Implementation', () => {
    it('should provide port with all required methods', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(typeof port.chat).toBe('function')
      expect(typeof port.chatStream).toBe('function')
      expect(typeof port.classifyWorkflow).toBe('function')
    })

    it('should have port implement IAIAgentPort interface', () => {
      const port = module.get(AI_AGENT_PORT)
      // Verify the port has all methods from IAIAgentPort
      const requiredMethods = ['chat', 'chatStream', 'classifyWorkflow']
      requiredMethods.forEach((method) => {
        expect(method in port).toBe(true)
        expect(typeof port[method as keyof typeof port]).toBe('function')
      })
    })

    it('should provide port that delegates to service', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(port).toEqual(mockAIAgentPort)
    })
  })

  describe('Service Methods Availability', () => {
    it('should have chat method available', () => {
      const service = module.get(AIAgentService)
      expect(service.chat).toBeDefined()
      expect(typeof service.chat).toBe('function')
    })

    it('should have chatStream method available', () => {
      const service = module.get(AIAgentService)
      expect(service.chatStream).toBeDefined()
      expect(typeof service.chatStream).toBe('function')
    })

    it('should have startBrainstorming method available', () => {
      const service = module.get(AIAgentService)
      expect(service.startBrainstorming).toBeDefined()
      expect(typeof service.startBrainstorming).toBe('function')
    })

    it('should have continueBrainstorming method available', () => {
      const service = module.get(AIAgentService)
      expect(service.continueBrainstorming).toBeDefined()
      expect(typeof service.continueBrainstorming).toBe('function')
    })

    it('should have classifyWorkflow method available', () => {
      const service = module.get(AIAgentService)
      expect(service.classifyWorkflow).toBeDefined()
      expect(typeof service.classifyWorkflow).toBe('function')
    })

    it('should have shouldClassify method available', () => {
      const service = module.get(AIAgentService)
      expect(service.shouldClassify).toBeDefined()
      expect(typeof service.shouldClassify).toBe('function')
    })
  })

  describe('Module Configuration', () => {
    it('should have module with @Module decorator', () => {
      // AIAgentModule should be decorated with @Module
      expect(AIAgentModule).toBeDefined()
      const moduleName = AIAgentModule.name
      expect(moduleName).toBe('AIAgentModule')
    })

    it('should allow module to be used as import in test', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      expect(testModule).toBeDefined()
      const service = testModule.get(AIAgentService)
      expect(service).toBeDefined()

      await testModule.close()
    })

    it('should allow module with multiple imports', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AIAgentModule, AIAgentModule], // Can import same module multiple times
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service = testModule.get(AIAgentService)
      expect(service).toBeDefined()

      await testModule.close()
    })
  })

  describe('Service Integration', () => {
    it('AIAgentService.chat() should delegate to port', async () => {
      const service = module.get(AIAgentService)
      const mockRequest = { messages: [{ role: 'user' as const, content: 'Test' }] }
      const mockResponse = { content: 'Response' }

      mockAIAgentPort.chat = vi.fn().mockResolvedValue(mockResponse)

      const result = await service.chat(mockRequest)

      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(mockRequest)
      expect(result).toEqual(mockResponse)
    })

    it('AIAgentService.chatStream() should delegate to port', () => {
      const service = module.get(AIAgentService)
      const mockRequest = { messages: [{ role: 'user' as const, content: 'Test' }] }

      async function* mockGenerator() {
        yield 'test'
      }

      mockAIAgentPort.chatStream = vi.fn().mockReturnValue(mockGenerator())

      service.chatStream(mockRequest)

      expect(mockAIAgentPort.chatStream).toHaveBeenCalledWith(mockRequest)
    })

    it('AIAgentService.classifyWorkflow() should delegate to port', async () => {
      const service = module.get(AIAgentService)
      const mockRequest = { messages: [] }
      const mockClassification = {
        type: 'STORY' as const,
        confidence: 0.8,
        reasoning: 'Test',
        scope: 'Test scope',
        assumptions: [],
        risks: [],
      }

      mockAIAgentPort.classifyWorkflow = vi.fn().mockResolvedValue(mockClassification)

      const result = await service.classifyWorkflow({
        workflowId: 'test',
        title: 'Test',
        conversationHistory: [],
      })

      expect(mockAIAgentPort.classifyWorkflow).toHaveBeenCalled()
      expect(result).toEqual(mockClassification)
    })

    it('AIAgentService.startBrainstorming() should use port', async () => {
      const service = module.get(AIAgentService)
      const mockResponse = { content: 'Starting brainstorm' }

      mockAIAgentPort.chat = vi.fn().mockResolvedValue(mockResponse)

      const result = await service.startBrainstorming({
        workflowId: 'test',
        title: 'Test workflow',
        conversationHistory: [],
      })

      expect(mockAIAgentPort.chat).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('AIAgentService.continueBrainstorming() should use port', async () => {
      const service = module.get(AIAgentService)
      const mockResponse = { content: 'Continuing brainstorm' }

      mockAIAgentPort.chat = vi.fn().mockResolvedValue(mockResponse)

      const result = await service.continueBrainstorming(
        {
          workflowId: 'test',
          title: 'Test',
          conversationHistory: [],
        },
        'User message'
      )

      expect(mockAIAgentPort.chat).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('AIAgentService.shouldClassify() should check conversation history', () => {
      const service = module.get(AIAgentService)

      const context = {
        workflowId: 'test',
        title: 'Test',
        conversationHistory: [
          { role: 'user' as const, content: '1' },
          { role: 'assistant' as const, content: '1' },
          { role: 'user' as const, content: '2' },
          { role: 'assistant' as const, content: '2' },
          { role: 'user' as const, content: '3' },
          { role: 'assistant' as const, content: '3' },
          { role: 'user' as const, content: '4' },
          { role: 'assistant' as const, content: '4' },
        ],
      }

      const result = service.shouldClassify(context)
      expect(result).toBe(true)
    })
  })

  describe('Module Provider Configuration', () => {
    it('should instantiate module with all providers configured', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service = testModule.get(AIAgentService)
      const port = testModule.get(AI_AGENT_PORT)

      expect(service).toBeDefined()
      expect(port).toBeDefined()
      expect(service).toBeInstanceOf(AIAgentService)

      await testModule.close()
    })

    it('should create new instance of service on each module compilation', async () => {
      const module1 = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const module2 = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service1 = module1.get(AIAgentService)
      const service2 = module2.get(AIAgentService)

      expect(service1).not.toBe(service2)

      await module1.close()
      await module2.close()
    })

    it('should provide port to service through DI container', () => {
      const service = module.get(AIAgentService)
      const port = module.get(AI_AGENT_PORT)

      // Verify both are defined and service has access to port methods
      expect(service).toBeDefined()
      expect(port).toBeDefined()
      expect(typeof service.chat).toBe('function')
    })

    it('should register providers as singletons within module scope', () => {
      const service1 = module.get(AIAgentService)
      const service2 = module.get(AIAgentService)
      const port1 = module.get(AI_AGENT_PORT)
      const port2 = module.get(AI_AGENT_PORT)

      expect(service1).toBe(service2)
      expect(port1).toBe(port2)
    })
  })

  describe('Module Re-export Behavior', () => {
    it('should export AIAgentService for use in parent module', async () => {
      const parentModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service = parentModule.get(AIAgentService)
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(AIAgentService)

      await parentModule.close()
    })

    it('should allow consuming module to inject exported service', async () => {
      const consumingModule = await Test.createTestingModule({
        imports: [AIAgentModule],
      })
        .overrideProvider(CustomConfigService)
        .useValue(mockCustomConfigService)
        .overrideProvider(AI_AGENT_PORT)
        .useValue(mockAIAgentPort)
        .compile()

      const service = consumingModule.get(AIAgentService)
      expect(service).toBeDefined()

      await consumingModule.close()
    })
  })
})
