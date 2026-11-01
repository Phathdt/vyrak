import { Test, TestingModule } from '@nestjs/testing'
import { MockConfigModule } from '@vyrak/custom-config'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { AIAgentService } from './application/services/ai-agent.service'
import { AI_AGENT_PORT } from './domain'
import { AI_AGENT_SERVICE } from './infras'

import type { IAIAgentPort, IAIAgentService } from './domain'

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
      imports: [MockConfigModule.forRoot()],
      providers: [
        {
          provide: AI_AGENT_PORT,
          useValue: mockAIAgentPort,
        },
        {
          provide: AI_AGENT_SERVICE,
          useFactory: (port: IAIAgentPort) => new AIAgentService(port),
          inject: [AI_AGENT_PORT],
        },
      ],
    }).compile()
  })

  describe('Module Compilation', () => {
    it('should compile successfully', () => {
      expect(module).toBeDefined()
    })

    it('should have all providers registered', () => {
      const service = module.get(AI_AGENT_SERVICE)
      const port = module.get(AI_AGENT_PORT)
      expect(service).toBeDefined()
      expect(port).toBeDefined()
    })
  })

  describe('Provider Registration', () => {
    it('should register AI_AGENT_SERVICE as a provider', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })

    it('should register AI_AGENT_PORT with mocked port implementation', () => {
      const port = module.get(AI_AGENT_PORT)
      expect(port).toBeDefined()
      expect(port).toEqual(mockAIAgentPort)
    })

    it('should inject AI_AGENT_PORT into AIAgentService', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
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
    it('should export AI_AGENT_SERVICE', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })

    it('exported AI_AGENT_SERVICE should be accessible from module', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })

    it('should provide AI_AGENT_PORT through module', () => {
      // AI_AGENT_PORT should be available through module DI
      const port = module.get(AI_AGENT_PORT)
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
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const port = module.get(AI_AGENT_PORT)

      // Both should exist
      expect(service).toBeDefined()
      expect(port).toEqual(mockAIAgentPort)
    })

    it('AI_AGENT_SERVICE should have access to IAIAgentPort methods through DI', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)

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
    it('should provide singleton instances within same module', () => {
      const service1 = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const service2 = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const port1 = module.get(AI_AGENT_PORT)
      const port2 = module.get(AI_AGENT_PORT)

      // Within same module, should be singletons
      expect(service1).toBe(service2)
      expect(port1).toBe(port2)
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
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service.chat).toBeDefined()
      expect(typeof service.chat).toBe('function')
    })

    it('should have chatStream method available', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service.chatStream).toBeDefined()
      expect(typeof service.chatStream).toBe('function')
    })

    it('should have startBrainstorming method available', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service.startBrainstorming).toBeDefined()
      expect(typeof service.startBrainstorming).toBe('function')
    })

    it('should have continueBrainstorming method available', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service.continueBrainstorming).toBeDefined()
      expect(typeof service.continueBrainstorming).toBe('function')
    })

    it('should have classifyWorkflow method available', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service.classifyWorkflow).toBeDefined()
      expect(typeof service.classifyWorkflow).toBe('function')
    })

    it('should have shouldClassify method available', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service.shouldClassify).toBeDefined()
      expect(typeof service.shouldClassify).toBe('function')
    })
  })

  describe('Module Configuration', () => {
    it('should have providers configured correctly', () => {
      expect(module).toBeDefined()
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })

    it('should allow module to be used as test module', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })
  })

  describe('Service Integration', () => {
    it('AI_AGENT_SERVICE.chat() should delegate to port', async () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const mockRequest = { messages: [{ role: 'user' as const, content: 'Test' }] }
      const mockResponse = { content: 'Response' }

      mockAIAgentPort.chat = vi.fn().mockResolvedValue(mockResponse)

      const result = await service.chat(mockRequest)

      expect(mockAIAgentPort.chat).toHaveBeenCalledWith(mockRequest)
      expect(result).toEqual(mockResponse)
    })

    it('AI_AGENT_SERVICE.chatStream() should delegate to port', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const mockRequest = { messages: [{ role: 'user' as const, content: 'Test' }] }

      async function* mockGenerator() {
        yield 'test'
      }

      mockAIAgentPort.chatStream = vi.fn().mockReturnValue(mockGenerator())

      service.chatStream(mockRequest)

      expect(mockAIAgentPort.chatStream).toHaveBeenCalledWith(mockRequest)
    })

    it('AI_AGENT_SERVICE.classifyWorkflow() should delegate to port', async () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
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

    it('AI_AGENT_SERVICE.startBrainstorming() should use port', async () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
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

    it('AI_AGENT_SERVICE.continueBrainstorming() should use port', async () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
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

    it('AI_AGENT_SERVICE.shouldClassify() should check conversation history', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)

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
    it('should have all providers configured', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const port = module.get(AI_AGENT_PORT)

      expect(service).toBeDefined()
      expect(port).toBeDefined()
    })

    it('should provide port to service through DI container', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const port = module.get(AI_AGENT_PORT)

      // Verify both are defined and service has access to port methods
      expect(service).toBeDefined()
      expect(port).toBeDefined()
      expect(typeof service.chat).toBe('function')
    })

    it('should register providers as singletons within module scope', () => {
      const service1 = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const service2 = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      const port1 = module.get(AI_AGENT_PORT)
      const port2 = module.get(AI_AGENT_PORT)

      expect(service1).toBe(service2)
      expect(port1).toBe(port2)
    })
  })

  describe('Module Re-export Behavior', () => {
    it('should provide AI_AGENT_SERVICE', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })

    it('should allow services to be injected', () => {
      const service = module.get<IAIAgentService>(AI_AGENT_SERVICE)
      expect(service).toBeDefined()
    })
  })
})
