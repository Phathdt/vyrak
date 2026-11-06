import { describe, expect, it, vi } from 'vitest'

import type { IConfigService } from '../config.interface'

/**
 * Demo test showing how to mock IConfigService in tests.
 * This pattern enables easier testing without loading real YAML configs.
 */
describe('IConfigService Injection Pattern', () => {
  it('should allow mocking config service in tests', () => {
    // Create a mock that implements IConfigService interface
    const mockConfig: IConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'database.url') return 'postgresql://test-db'
        if (key === 'host.port') return 3000
        return undefined
      }),
      database: { url: 'postgresql://test-db' },
      host: { port: 3000 },
      redis: { url: 'redis://localhost' },
      log: { level: 'debug', enableJsonFormat: false },
      workspace: {
        mode: 'worktree',
        mainReposPath: '/tmp/repos',
        workspacesPath: '/tmp/workspaces',
        worktreeBaseBranch: 'main',
        worktreeBranchPrefix: 'workflow/',
        worktreeAutoFetch: true,
        worktreeAutoCleanupBranch: true,
        cleanupOnSuccess: true,
        cleanupOnFailure: false,
      },
      agentRuntime: { useFakeAgent: true, claudeCliPath: '/usr/bin/claude' },
      jwt: { secret: 'test-secret', expiry: '1h' },
      s3: {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        forcePathStyle: true,
      },
      git: { token: '', userName: 'vyrak-bot', userEmail: 'vyrak-bot@users.noreply.github.com' },
      worker: { chatConcurrency: 5, executionConcurrency: 1 },
      anthropic: {
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        authScheme: 'x-api-key',
      },
      frontendUrl: 'http://localhost:5173',
    }

    // Example service that depends on IConfigService
    class TestService {
      constructor(private readonly config: IConfigService) {}

      getDatabaseUrl(): string {
        return this.config.database.url
      }

      getPort(): number {
        return this.config.get<number>('host.port')
      }
    }

    // Inject mock config into service
    const service = new TestService(mockConfig)

    // Test service behavior
    expect(service.getDatabaseUrl()).toBe('postgresql://test-db')
    expect(service.getPort()).toBe(3000)
    expect(mockConfig.get).toHaveBeenCalledWith('host.port')
  })

  it('should allow partial mocking for specific test scenarios', () => {
    // Mock only what you need for a specific test
    const minimalMock: Partial<IConfigService> = {
      get: vi.fn().mockReturnValue('mocked-value'),
      database: { url: 'postgresql://minimal' },
      host: { port: 8080 },
    }

    // Type assertion for demonstration (in real tests, use full mock)
    const config = minimalMock as IConfigService

    expect(config.database.url).toBe('postgresql://minimal')
    expect(config.host.port).toBe(8080)
  })
})
