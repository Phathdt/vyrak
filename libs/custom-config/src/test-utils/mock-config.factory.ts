import type { IConfigService } from '../config.interface'

/**
 * Factory to create mock IConfigService instances for testing.
 * Provides sensible defaults and allows overriding specific properties.
 */
export function createMockConfigService(overrides?: Partial<IConfigService>): IConfigService {
  const defaultConfig: IConfigService = {
    host: {
      port: 3000,
    },
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
    },
    redis: {
      url: 'redis://localhost:6379',
    },
    log: {
      level: 'info',
      enableJsonFormat: false,
    },
    frontendUrl: 'http://localhost:5173',
    jwt: {
      secret: 'test-secret-key',
      expiry: '1h',
    },
    anthropic: {
      apiKey: 'test-api-key',
      apiUrl: undefined,
      model: 'claude-3-5-sonnet-20241022',
    },
    agentRuntime: {
      useFakeAgent: false,
      claudeCliPath: 'claude',
    },
    s3: {
      endpoint: 'http://localhost:4566',
      region: 'us-east-1',
      bucket: 'test-bucket',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      forcePathStyle: true,
    },
    git: {
      token: '',
      userName: 'vyrak-bot',
      userEmail: 'vyrak-bot@users.noreply.github.com',
    },
    worker: {
      chatConcurrency: 5,
      executionConcurrency: 1,
    },
    workspace: {
      mode: 'worktree',
      workspacesPath: '/tmp/test-workspaces',
      mainReposPath: '/tmp/test-repos',
      cleanupOnSuccess: true,
      cleanupOnFailure: false,
      worktree: {
        baseBranch: 'main',
        branchPrefix: 'workflow/',
        autoFetch: true,
        autoCleanupBranch: true,
      },
    },
    get: ((key: string) => {
      const keys = key.split('.')
      let value: unknown = defaultConfig
      for (const k of keys) {
        value = value?.[k as keyof typeof value]
      }
      return value
    }) as IConfigService['get'],
  }

  // Deep merge overrides
  return {
    ...defaultConfig,
    ...overrides,
    host: { ...defaultConfig.host, ...overrides?.host },
    database: { ...defaultConfig.database, ...overrides?.database },
    redis: { ...defaultConfig.redis, ...overrides?.redis },
    log: { ...defaultConfig.log, ...overrides?.log },
    jwt: { ...defaultConfig.jwt, ...overrides?.jwt },
    anthropic: overrides?.anthropic ? { ...defaultConfig.anthropic, ...overrides.anthropic } : defaultConfig.anthropic,
    agentRuntime: { ...defaultConfig.agentRuntime, ...overrides?.agentRuntime },
    s3: { ...defaultConfig.s3, ...overrides?.s3 },
    git: { ...defaultConfig.git, ...overrides?.git },
    worker: { ...defaultConfig.worker, ...overrides?.worker },
    workspace: {
      ...defaultConfig.workspace,
      ...overrides?.workspace,
      worktree: {
        ...defaultConfig.workspace.worktree,
        ...overrides?.workspace?.worktree,
      },
    },
  }
}

/**
 * Minimal mock for tests that only need anthropic config
 */
export function createMockConfigServiceMinimal(): IConfigService {
  return createMockConfigService({
    anthropic: {
      apiKey: 'test-api-key',
      apiUrl: undefined,
      model: 'claude-3-5-sonnet-20241022',
    },
  })
}
