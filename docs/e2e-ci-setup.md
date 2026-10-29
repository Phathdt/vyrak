# E2E CI Setup

## Overview

E2E tests trong GitHub Actions sử dụng **Docker service containers** thay vì Testcontainers để đạt được sự đơn giản và hiệu suất tốt nhất.

## Kiến trúc

```
┌─────────────────────────────────────────────────┐
│           GitHub Actions Runner                  │
│                                                  │
│  ┌──────────────┐         ┌─────────────────┐  │
│  │  PostgreSQL  │◄────────┤   API Server    │  │
│  │  Container   │         │   (port 3000)   │  │
│  │  (port 5432) │         └─────────────────┘  │
│  └──────────────┘                 ▲             │
│                                   │             │
│                            ┌──────┴──────────┐  │
│                            │   Web App       │  │
│                            │   (port 5173)   │  │
│                            └─────────────────┘  │
│                                   ▲             │
│                            ┌──────┴──────────┐  │
│                            │  Playwright     │  │
│                            │  E2E Tests      │  │
│                            └─────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Workflow: `.github/workflows/e2e.yml`

### Trigger Events
- Push to `main` hoặc `develop`
- Pull requests to `main` hoặc `develop`
- Manual dispatch (`workflow_dispatch`)

### Services

**PostgreSQL 17 Alpine:**
- Database: `vyrak_e2e`
- Port: 5432
- Health checks: `pg_isready` every 10s

### Steps

1. **Setup Environment**
   - Checkout code
   - Setup Node.js 24.16.0
   - Cache yarn dependencies

2. **Database Setup**
   - Install dependencies
   - Generate Prisma Client
   - Run migrations (`yarn db:migrate:deploy`)
   - Seed test data (`yarn db:seed:test`)

3. **Browser Setup**
   - Install Playwright Chromium browser
   - Playwright version: `^1.48.2`

4. **Build Applications**
   - Build backend packages (libs + api-server)
   - Generate API client from OpenAPI
   - Build frontend (production mode)

5. **Start Services (Background)**
   - Start API server on port 3000
   - Wait for health check (`/health`)
   - Start web app on port 5173
   - Wait until app is ready

6. **Run Tests**
   - Execute `yarn test:e2e`
   - CI mode: sequential execution, 1 worker
   - Chromium only
   - Retries: 2

7. **Artifacts (on failure)**
   - `playwright-report/` - HTML report
   - `test-results/` - Screenshots, videos, traces
   - Retention: 7 days

8. **Cleanup**
   - Stop API server
   - Stop web app

## Tại sao Docker Service Containers?

### ✅ Ưu điểm

1. **Đơn giản**: GitHub Actions native support, không cần code phức tạp
2. **Nhanh**: Container start song song với workflow steps
3. **Đáng tin cậy**: Pattern đã proven trong `integration-tests.yml`
4. **Dễ maintain**: Ít dependencies, ít moving parts
5. **Cost-effective**: Không overhead của Testcontainers trong CI

### ❌ Testcontainers không phù hợp vì:

1. Cần Docker-in-Docker setup phức tạp
2. Chậm hơn đáng kể (start/stop containers cho mỗi suite)
3. Overkill cho use case này (E2E tests đã sequential)
4. Thêm complexity không cần thiết
5. Khó debug trong CI environment

## Configuration

### Environment Variables

**API Server:**
```bash
NODE_ENV=production
PORT=3000
DATABASE__URL=postgresql://postgres:postgres@localhost:5432/vyrak_e2e
```

**Web App:**
```bash
VITE_API_BASE_URL=http://localhost:3000
```

**E2E Tests:**
```bash
CI=true
BASE_URL=http://localhost:5173
API_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test123456!
```

### Playwright Config (CI mode)

```typescript
{
  fullyParallel: false,        // Sequential
  workers: 1,                   // Single worker
  retries: 2,                   // Retry failed tests
  reporter: ['html', 'json', 'list', 'github'],
  projects: [
    { name: 'chromium' }        // Chromium only
  ]
}
```

## Test Data

**Seeding:**
- Test user được seed bởi `yarn db:seed:test`
- Script: `prisma/seed-test.ts`
- Email: `test@example.com`
- Password: `Test123456!`

**Global Setup:**
- `apps/e2e/config/global-setup.ts`
- Runs migrations và seeding trước tất cả tests
- Ensures clean database state

## Running Locally

```bash
# Start services
yarn dev

# Run E2E tests (headless)
yarn test:e2e

# Run with UI
yarn test:e2e:ui

# Run headed mode
yarn test:e2e:headed
```

## Debugging CI Failures

### 1. Check Artifacts
- Download `playwright-report` từ failed workflow
- Download `test-results` để xem screenshots/videos

### 2. Check Logs
```bash
# API server logs
grep "Start API server" workflow-logs.txt

# Web app logs
grep "Start web app" workflow-logs.txt

# Health check logs
grep "Wait for API server" workflow-logs.txt
```

### 3. Reproduce Locally
```bash
# Set CI mode
export CI=true

# Run tests
yarn test:e2e
```

### 4. Common Issues

**Timeout waiting for services:**
- Increase timeout in wait steps
- Check if ports are correct
- Verify health endpoints

**Test flakiness:**
- Already handled với `retries: 2`
- Sequential execution với `workers: 1`
- Use stable selectors (data-testid, roles)

**Database state:**
- Global setup ensures clean state
- Sequential tests prevent conflicts

## Performance

**Typical CI run time:**
- Setup: ~2 minutes
- Tests: ~3-5 minutes
- Total: ~7-8 minutes

**Optimizations:**
- Yarn cache: ~1 minute saved
- Turbo cache: ~2 minutes saved
- Sequential execution: stability > speed

## Future Enhancements

1. **Parallel execution** (nếu tests isolated tốt hơn)
2. **Visual regression testing** (Percy, Chromatic)
3. **Mobile browser testing** (tablet, mobile viewports)
4. **Cross-browser testing** (Firefox, Safari - optional)
5. **Performance budgets** (Lighthouse CI)

## Related Files

- Workflow: `.github/workflows/e2e.yml`
- Playwright config: `apps/e2e/config/playwright.config.ts`
- Global setup: `apps/e2e/config/global-setup.ts`
- Test user seed: `prisma/seed-test.ts`
- E2E docs: `apps/e2e/README.md`

## References

- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [GitHub Actions Services](https://docs.github.com/en/actions/using-containerized-services/about-service-containers)
- Integration tests workflow: `.github/workflows/integration-tests.yml`
