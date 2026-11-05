# CustomConfig Test Utils

Utilities for testing modules that depend on `CustomConfigService`.

## Problem

`CustomConfigModule` is a `@Global()` module that validates all required environment variables on initialization. This causes test failures when importing modules that depend on it:

```typescript
// ❌ This fails with "Configuration validation failed"
const module = await Test.createTestingModule({
  imports: [SomeModule], // SomeModule imports CustomConfigModule
})
  .overrideProvider(CONFIG_SERVICE)
  .useValue(mockConfig)
  .compile()
```

The issue: `CustomConfigModule` factory runs validation **before** the test override can take effect.

## Solution

Use `MockConfigModule` instead of importing the real `CustomConfigModule`:

```typescript
import { MockConfigModule } from '@vyrak/custom-config'

// ✅ Correct: Use MockConfigModule
const module = await Test.createTestingModule({
  imports: [MockConfigModule.forRoot(), SomeModule],
})
  .overrideProvider(SomeService)
  .useValue(mockService)
  .compile()
```

## API

### `MockConfigModule.forRoot(config?)`

Creates a global test module that provides `CONFIG_SERVICE` with mock config.

**Parameters:**
- `config?: Partial<IConfigService>` - Optional config overrides

**Returns:** `DynamicModule`

**Example:**

```typescript
// Default config
MockConfigModule.forRoot()

// Custom config
MockConfigModule.forRoot({
  anthropic: {
    apiKey: 'custom-key',
    model: 'claude-opus-4-20250514',
  },
})
```

### `createMockConfigService(overrides?)`

Factory function to create mock `IConfigService` instances.

**Parameters:**
- `overrides?: Partial<IConfigService>` - Config property overrides

**Returns:** `IConfigService`

**Example:**

```typescript
import { createMockConfigService } from '@vyrak/custom-config'

const config = createMockConfigService({
  database: {
    url: 'postgresql://custom:custom@localhost:5432/custom',
  },
})

console.log(config.database.url) // 'postgresql://custom:custom@localhost:5432/custom'
console.log(config.anthropic.apiKey) // 'test-api-key' (default)
```

### `createMockConfigServiceMinimal()`

Minimal mock with only anthropic config for simple tests.

**Returns:** `IConfigService`

**Example:**

```typescript
import { createMockConfigServiceMinimal } from '@vyrak/custom-config'

const config = createMockConfigServiceMinimal()
```

## Usage Patterns

### Pattern 1: Full Module Test with MockConfigModule

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { MockConfigModule } from '@vyrak/custom-config'

describe('YourModule', () => {
  let module: TestingModule

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        MockConfigModule.forRoot(), // ✅ Provides global CONFIG_SERVICE
        YourModule,
      ],
    }).compile()
  })

  it('should work', () => {
    const service = module.get(YOUR_SERVICE)
    expect(service).toBeDefined()
  })
})
```

### Pattern 2: Custom Config Override

```typescript
beforeEach(async () => {
  module = await Test.createTestingModule({
    imports: [
      MockConfigModule.forRoot({
        anthropic: {
          apiKey: 'test-key-123',
          model: 'claude-3-5-sonnet-20241022',
        },
      }),
      YourModule,
    ],
  }).compile()
})
```

### Pattern 3: Factory for Manual DI

```typescript
import { createMockConfigService } from '@vyrak/custom-config'

describe('YourService', () => {
  it('should work with mock config', () => {
    const config = createMockConfigService({
      redis: { url: 'redis://test:6379' },
    })

    const service = new YourService(config)
    expect(service).toBeDefined()
  })
})
```

## Default Mock Values

The mock provides sensible defaults for all config properties:

```typescript
{
  host: { port: 3000 },
  database: { url: 'postgresql://test:test@localhost:5432/test' },
  redis: { url: 'redis://localhost:6379' },
  anthropic: {
    apiKey: 'test-api-key',
    apiUrl: undefined,
    model: 'claude-3-5-sonnet-20241022',
  },
  s3: {
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    bucket: 'test-bucket',
    // ...
  },
  workspace: {
    mode: 'worktree',
    workspacesPath: '/tmp/test-workspaces',
    // ...
  },
  // ... all other config
}
```

## Deep Merge

Overrides are deeply merged with defaults:

```typescript
const config = createMockConfigService({
  workspace: {
    worktree: {
      baseBranch: 'develop', // Override one property
    },
  },
})

// Other workspace.worktree properties retain defaults
console.log(config.workspace.worktree.branchPrefix) // 'workflow/'
console.log(config.workspace.worktree.baseBranch) // 'develop'
```

## Migration Guide

### Before (Broken)

```typescript
import { CONFIG_SERVICE, createMockConfigService } from '@vyrak/custom-config'

// ❌ Fails: CustomConfigModule validates before override
const module = await Test.createTestingModule({
  imports: [YourModule],
})
  .overrideProvider(CONFIG_SERVICE)
  .useValue(createMockConfigService())
  .compile()
```

### After (Fixed)

```typescript
import { MockConfigModule } from '@vyrak/custom-config'

// ✅ Works: MockConfigModule bypasses validation
const module = await Test.createTestingModule({
  imports: [MockConfigModule.forRoot(), YourModule],
}).compile()
```

## Troubleshooting

### Error: "Configuration validation failed"

You're still importing the real `CustomConfigModule`. Replace it with `MockConfigModule.forRoot()`.

### Error: "Cannot read properties of undefined (reading 'forRoot')"

Check your import:

```typescript
// ❌ Wrong
import { MockConfigModule } from '@vyrak/custom-config/test-utils'

// ✅ Correct
import { MockConfigModule } from '@vyrak/custom-config'
```

The test utils are re-exported from the main package.

### TypeScript Error: Module has no exported member

Run `pnpm ctix` to regenerate barrel exports.
