# @vyrak/custom-config

Configuration service cho Vyrak monorepo với YAML-based config và environment variable overrides.

## Features

- ✅ YAML configuration files theo môi trường (`local.yaml`, `development.yaml`, `staging.yaml`, `production.yaml`)
- ✅ Environment variable overrides với double-underscore notation (`DATABASE__URL`)
- ✅ Type-safe config access với TypeScript interfaces
- ✅ Interface injection pattern cho dễ dàng testing và mocking
- ✅ Auto-discovery project root
- ✅ Validation config khi khởi tạo

## Installation

Package này là internal workspace package, không cần install riêng.

```bash
# Import trong NestJS module
import { CustomConfigModule } from '@vyrak/custom-config'

@Module({
  imports: [CustomConfigModule],
})
export class AppModule {}
```

## Usage

### 1. Direct Injection (Simple)

Inject `CustomConfigService` trực tiếp:

```typescript
import { CustomConfigService } from '@vyrak/custom-config'

export class WorkflowService {
  constructor(private readonly config: CustomConfigService) {}

  someMethod() {
    const dbUrl = this.config.database.url
    const port = this.config.host.port
  }
}
```

### 2. Interface Injection (Recommended for Testing)

Sử dụng interface để inject, giúp dễ dàng mock trong tests:

```typescript
import { Inject } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import { CONFIG_SERVICE } from '@vyrak/custom-config'

export class WorkflowService {
  constructor(
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService
  ) {}

  getDatabaseUrl(): string {
    return this.config.database.url
  }

  getPort(): number {
    return this.config.get<number>('host.port')
  }
}
```

### 3. Testing with Mock Config

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { IConfigService } from '@vyrak/custom-config'

describe('WorkflowService', () => {
  it('should work with mock config', () => {
    // Create mock config
    const mockConfig: IConfigService = {
      get: vi.fn(),
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
      frontendUrl: 'http://localhost:5173',
    }

    // Inject mock into service
    const service = new WorkflowService(mockConfig)

    // Test
    expect(service.getDatabaseUrl()).toBe('postgresql://test-db')
  })
})
```

## Configuration Structure

### YAML File (`config/local.yaml`)

```yaml
database:
  url: postgresql://postgres:postgres@localhost:5432/vyrak

host:
  port: 3000

redis:
  url: redis://localhost:6379

log:
  level: debug
  enable_json_format: false

workspace:
  mode: worktree
  main_repos_path: /var/vyrak/repos
  workspaces_path: /tmp/vyrak-workspaces
  worktree_base_branch: main
  worktree_branch_prefix: workflow/
  worktree_auto_fetch: true
  worktree_auto_cleanup_branch: true
  cleanup_on_success: true
  cleanup_on_failure: false

agent_runtime:
  use_fake_agent: false
  claude_cli_path: /usr/local/bin/claude

jwt:
  secret: your-secret-key
  expiry: 7d

s3:
  endpoint: http://localhost:4566
  region: us-east-1
  bucket: vyrak-artifacts
  access_key_id: test
  secret_access_key: test
  force_path_style: true

anthropic:
  api_key: replace_me
  api_url: replace_me  # Optional, defaults to official Anthropic API
  model: claude-3-5-sonnet-20241022
  auth_scheme: x-api-key  # or "bearer" for OpenAI-style proxies

frontend_url: http://localhost:5173
```

### Environment Variables Override

Sử dụng double-underscore (`__`) notation để override config từ environment variables:

```bash
# apps/api-server/.env
DATABASE__URL=postgresql://prod-db
HOST__PORT=8080
REDIS__URL=redis://prod-redis

# Top-level keys support both formats
FRONTEND_URL=https://vyrak.com
# or
FRONTEND__URL=https://vyrak.com

# Nested keys (require __ notation)
WORKSPACE__MODE=worktree
WORKSPACE__MAIN_REPOS_PATH=/var/vyrak/repos

# S3 config
S3__ENDPOINT=http://localhost:4566
S3__BUCKET=vyrak-artifacts

# Anthropic config (optional)
ANTHROPIC__API_KEY=sk-ant-xxx
ANTHROPIC__API_URL=https://api.anthropic.com  # Optional
ANTHROPIC__MODEL=claude-3-5-sonnet-20241022
ANTHROPIC__AUTH_SCHEME=x-api-key  # or "bearer"
```

## API Reference

### IConfigService

```typescript
interface IConfigService {
  // Generic getter với dot-notation
  get<T>(key: string): T

  // Type-safe property access
  readonly database: DatabaseConfig
  readonly host: HostConfig
  readonly redis: RedisConfig
  readonly log: LogConfig
  readonly workspace: WorkspaceConfig
  readonly agentRuntime: AgentRuntimeConfig
  readonly jwt: JwtConfig
  readonly s3: S3Config
  readonly anthropic?: AnthropicConfig
  readonly frontendUrl: string
}
```

### Available Types

```typescript
interface DatabaseConfig {
  url: string
}

interface HostConfig {
  port: number
}

interface RedisConfig {
  url: string
}

interface LogConfig {
  level: string
  enableJsonFormat: boolean
}

interface WorkspaceConfig {
  mode: 'worktree'
  mainReposPath: string
  workspacesPath: string
  worktreeBaseBranch: string
  worktreeBranchPrefix: string
  worktreeAutoFetch: boolean
  worktreeAutoCleanupBranch: boolean
  cleanupOnSuccess: boolean
  cleanupOnFailure: boolean
}

interface AgentRuntimeConfig {
  useFakeAgent: boolean
  claudeCliPath: string
}

interface JwtConfig {
  secret: string
  expiry: string
}

interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

interface AnthropicConfig {
  apiKey: string
  apiUrl?: string  // Optional, defaults to official Anthropic API
  model: string
  authScheme?: 'x-api-key' | 'bearer'  // Default: 'x-api-key'
}
```

## Best Practices

### ✅ DO: Use Interface Injection

```typescript
// ✅ Good - Easy to mock
import { Inject } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import { CONFIG_SERVICE } from '@vyrak/custom-config'

export class MyService {
  constructor(
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService
  ) {}
}
```

### ❌ DON'T: Use Direct Class Injection in Libs

```typescript
// ❌ Bad - Hard to mock, creates tight coupling
import { CustomConfigService } from '@vyrak/custom-config'

export class MyService {
  constructor(private readonly config: CustomConfigService) {}
}
```

### ✅ DO: Use Type-safe Property Access

```typescript
// ✅ Good - Type-safe, autocomplete works
const dbUrl = this.config.database.url
const port = this.config.host.port
```

### ❌ DON'T: Use Generic Getter for Everything

```typescript
// ❌ Bad - No type safety, prone to typos
const dbUrl = this.config.get('database.url')  // Returns unknown
const port = this.config.get('host.port')      // No autocomplete
```

### ✅ DO: Create Full Mock in Test Setup

```typescript
// ✅ Good - Reusable mock factory
function createMockConfig(overrides?: Partial<IConfigService>): IConfigService {
  return {
    get: vi.fn(),
    database: { url: 'postgresql://test' },
    host: { port: 3000 },
    // ... full config
    ...overrides,
  }
}

const mockConfig = createMockConfig({ host: { port: 8080 } })
```

## Validation Rules

Config sẽ được validate khi khởi tạo service. Các trường bắt buộc:

- ✅ `database.url` - Không được để trống hoặc "replace_me"
- ✅ `host.port` - Phải là số dương
- ✅ `redis.url` - Không được để trống
- ✅ `frontendUrl` - Không được để trống
- ✅ `workspace.mode` - Phải là "worktree"
- ✅ `workspace.mainReposPath` - Bắt buộc cho worktree mode
- ✅ `workspace.workspacesPath` - Không được để trống
- ✅ `s3.*` - Tất cả fields bắt buộc nếu s3 config được define
- ⚠️ `anthropic.*` - Optional, chỉ validate nếu `apiKey` không phải placeholder

## Examples

### Example: Using in Repository

```typescript
import { Inject } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import { CONFIG_SERVICE } from '@vyrak/custom-config'
import { PrismaService } from '@vyrak/database'

export class WorkflowRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService
  ) {}

  async findWorkspaceConfig() {
    return {
      mode: this.config.workspace.mode,
      mainReposPath: this.config.workspace.mainReposPath,
    }
  }
}
```

### Example: Using in Service

```typescript
import { Inject } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import { CONFIG_SERVICE } from '@vyrak/custom-config'

export class WorkflowExecutionService {
  constructor(
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService
  ) {}

  async executeWorkflow() {
    const useFake = this.config.agentRuntime.useFakeAgent
    const claudePath = this.config.agentRuntime.claudeCliPath

    if (useFake) {
      // Use fake agent for testing
    } else {
      // Execute real Claude CLI
    }
  }
}
```

## Migration Guide

Nếu bạn đang sử dụng `CustomConfigService` trực tiếp, migration sang interface injection:

### Before (Old Pattern)

```typescript
import { CustomConfigService } from '@vyrak/custom-config'

export class MyService {
  constructor(private readonly config: CustomConfigService) {}
}
```

### After (New Pattern)

```typescript
import { Inject } from '@nestjs/common'
import type { IConfigService } from '@vyrak/custom-config'
import { CONFIG_SERVICE } from '@vyrak/custom-config'

export class MyService {
  constructor(
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService
  ) {}
}
```

## License

MIT
