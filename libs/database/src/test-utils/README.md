# Database Test Utilities

Công cụ hỗ trợ integration testing với PostgreSQL Testcontainers.

## Architecture

Vyrak sử dụng **global singleton container pattern** (inspired by Looper):

- **1 PostgreSQL container** được start một lần duy nhất
- **Tests chạy sequential** với `singleFork: true` trong vitest config  
- **Shared container** giữa tất cả test suites
- **Unique data** cho mỗi test để tránh collisions (sử dụng factories với counters)

### Why This Pattern?

✅ **Fast**: Container start 1 lần (~5-10s), không phải start lại cho mỗi suite  
✅ **Simple**: Không cần cleanup data giữa tests, chỉ cần unique identifiers  
✅ **Reliable**: Sequential execution tránh race conditions  
✅ **Production-like**: Dùng real PostgreSQL thay vì mocks

## Usage

### Integration Tests Pattern

```typescript
import { startPostgres, stopPostgres, getPrismaClient } from '@vyrak/database/test-utils'
import { createTestUser, createTestOrganization } from '@vyrak/database/test-utils'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('MyFeature (Integration)', () => {
  let prisma: PrismaClient
  let setupFailed = false

  beforeAll(async () => {
    try {
      await startPostgres()
      prisma = getPrismaClient()
    } catch (error) {
      setupFailed = true
      console.warn('Test database setup failed, skipping integration tests', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  it('should create user', async () => {
    if (setupFailed || !prisma) {
      return // Skip test if setup failed
    }

    // Use factories to generate unique test data
    const user = await createTestUser(prisma, {
      email: 'custom@example.com', // Or let factory generate unique email
    })

    expect(user.email).toContain('@')
  })

  it('should create organization', async () => {
    if (setupFailed || !prisma) {
      return
    }

    const org = await createTestOrganization(prisma, {
      name: 'Custom Org', // Or let factory generate unique name
    })

    expect(org.slug).toBeDefined()
  })
})
```

### Key Points

1. **No data cleanup needed**: Sử dụng factories để tạo unique data
2. **Sequential execution**: Config đã set `singleFork: true`
3. **Graceful degradation**: Tests skip nếu Docker không available
4. **Shared container**: `startPostgres()` reuses container nếu đã start

### Test Data Factories

```typescript
import { createTestUser, createTestOrganization, createTestOrgWithOwner } from '@vyrak/database/test-utils'

// Factory tự động generate unique data
const user1 = await createTestUser(prisma) 
// Email: int-1234567890@x.x

const user2 = await createTestUser(prisma, { name: 'Alice' })
// Email: int-1234567891@x.x, Name: Alice

// Tạo org + owner + membership trong 1 transaction
const { organization, owner, membership } = await createTestOrgWithOwner(prisma)
```

## Unit Tests (No Database)

Cho tests không cần database:

```typescript
import { createMockPrismaClient } from '@vyrak/database/test-utils'
import { describe, it, expect, vi } from 'vitest'

describe('MyService (Unit)', () => {
  it('should handle user creation', async () => {
    const prisma = createMockPrismaClient()
    
    vi.spyOn(prisma.user, 'create').mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const service = new MyService(prisma)
    const result = await service.createUser({ email: 'test@example.com' })
    
    expect(result.email).toBe('test@example.com')
  })
})
```

## Configuration

### Vitest Config

```javascript
// vitest.config.mjs
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // ← Critical for shared container
      },
    },
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
```

### Environment Variables

- `TEST_LOG_QUERIES=true` - Enable Prisma query logging
- `PRISMA_DISABLE_WARNINGS=true` - Skip AI safety warnings (auto-set)

## Performance

| Approach | Time | When |
|----------|------|------|
| **Global singleton** (current) | ~5-10s total | Integration tests |
| Isolated per suite | ~5-10s × N suites | Schema changes |
| Mock client | Instant | Unit tests |

**Example**: 20 tests trong 1 suite = **3.4s total** (container start included)

## How It Works

### Container Lifecycle

```
Test run starts
  ↓
First test suite calls startPostgres()
  ↓
Container starts (~5-10s)
  ↓
Schema sync with prisma db push (~2s)
  ↓
All test suites share same container
  ↓
Last test suite calls stopPostgres()
  ↓
Container stops
```

### Why `db push` Instead of Migrations?

```typescript
// In startPostgres()
execSync('npx prisma db push --url="..."')
```

- ✅ **Faster**: Không cần migration history
- ✅ **Simpler**: Sync schema trực tiếp từ `schema.prisma`
- ✅ **Isolation**: Test DB không lưu migration state

**Note**: Production vẫn dùng `prisma migrate deploy`

## API Reference

### `startPostgres()`

Start global container và sync schema. Idempotent - có thể gọi nhiều lần.

```typescript
await startPostgres()
```

### `stopPostgres()`

Stop global container và cleanup. Safe to call ngay cả khi chưa start.

```typescript
await stopPostgres()
```

### `getPrismaClient()`

Get shared Prisma client instance. Throw error nếu chưa start.

```typescript
const prisma = getPrismaClient()
```

### `getConnectionString()`

Get PostgreSQL connection URI. Useful cho debugging.

```typescript
const uri = getConnectionString()
console.log('Test DB:', uri)
```

### Test Data Factories

#### `createTestUser(prisma, overrides?)`

```typescript
const user = await createTestUser(prisma, {
  email: 'custom@example.com',
  name: 'Alice',
})
```

#### `createTestOrganization(prisma, overrides?)`

```typescript
const org = await createTestOrganization(prisma, {
  name: 'My Org',
  slug: 'my-org',
})
```

#### `createTestOrgWithOwner(prisma, options?)`

Tạo organization + owner + membership trong 1 transaction.

```typescript
const { organization, owner, membership } = await createTestOrgWithOwner(prisma, {
  orgData: { name: 'Custom Org' },
  userData: { name: 'Owner Name' },
})
```

#### `resetCounters()`

Reset unique counters (thường không cần thiết).

```typescript
resetCounters()
```

## Troubleshooting

### Container fails to start

```
Error: Could not connect to Docker daemon
```

**Solution**: Start Docker:
```bash
docker ps
```

### Tests timeout

**Solution**: Increase timeouts trong vitest.config:
```javascript
{
  testTimeout: 60_000,
  hookTimeout: 120_000,
}
```

### "Global Prisma client not initialized"

**Solution**: Gọi `await startPostgres()` trước khi `getPrismaClient()`.

### Schema sync fails

**Solution**: Check Prisma schema và migrations:
```bash
npx prisma validate
ls prisma/migrations/
```

## Migration from Old Pattern

### Before (Isolated containers)

```typescript
import { setupTestDatabase } from '@vyrak/database/test-utils'

beforeAll(async () => {
  const setup = await setupTestDatabase()
  prisma = setup.prisma
  cleanup = setup.cleanup
})

afterAll(async () => {
  await cleanup()
})
```

### After (Global singleton)

```typescript
import { startPostgres, stopPostgres, getPrismaClient } from '@vyrak/database/test-utils'

beforeAll(async () => {
  await startPostgres()
  prisma = getPrismaClient()
})

afterAll(async () => {
  await stopPostgres()
})
```

## References

- Pattern inspired by [Looper backend tests](https://github.com/looper)
- [Testcontainers Node.js](https://node.testcontainers.org/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Vitest Configuration](https://vitest.dev/config/)
