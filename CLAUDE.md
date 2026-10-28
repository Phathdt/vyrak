# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Name:** Vyrak
**Type:** TypeScript Monorepo (Turborepo)
**Description:** A comprehensive full-stack boilerplate for building professional applications with type-safe API integration using OpenAPI + Orval pattern.

## Architecture

### Monorepo Structure

```
vyrak/
├── apps/
│   ├── api-server/     # NestJS REST API - Controllers ONLY
│   ├── web/            # React + Vite frontend
│   ├── worker/         # BullMQ background worker - Processors/Consumers ONLY
│   └── e2e/            # Playwright E2E tests
├── libs/
│   ├── custom-config/  # Environment configuration
│   ├── custom-logger/  # Logging utilities
│   ├── database/       # Prisma ORM client
│   ├── shared/         # Shared utilities and types
│   └── product/        # Product domain module (reference implementation)
├── config/             # Shared base configurations
│   ├── rolldown.base.mjs      # Base Rolldown config (createLibConfig, createAppConfig)
│   ├── tsconfig.base.json     # Base TypeScript config
│   ├── tsconfig.lib.json      # TypeScript config for libs
│   └── tsconfig.app.json      # TypeScript config for apps
└── docs/               # Documentation
```

### Hexagonal Architecture Pattern (libs/)

**CRITICAL RULE:** All new business modules MUST be created in `libs/` following the hexagonal architecture pattern demonstrated by `libs/product/`. Only controllers and processors/consumers belong in `api-server` and `worker`.

**Module Structure (libs/{module-name}/):**

```
libs/{module-name}/
├── src/
│   ├── {module-name}.module.ts    # NestJS module (DI container)
│   ├── index.ts                   # Public API barrel export
│   ├── domain/                    # Business contracts (framework-independent)
│   │   ├── index.ts
│   │   ├── entities/
│   │   │   ├── index.ts
│   │   │   └── {entity}.entity.ts      # Entity type + Zod schema
│   │   ├── interfaces/
│   │   │   ├── index.ts
│   │   │   ├── {module}.repository.interface.ts
│   │   │   └── {module}.service.interface.ts
│   │   └── schemas/
│   │       ├── index.ts
│   │       └── {module}.schemas.ts     # DTOs (CreateDto, UpdateDto, ResponseDto)
│   ├── application/               # Business logic orchestration
│   │   ├── index.ts
│   │   └── services/
│   │       ├── index.ts
│   │       └── {module}.service.ts     # Implements I{Module}Service
│   └── infras/                    # Framework & external system implementations
│       ├── index.ts
│       ├── di/
│       │   ├── index.ts
│       │   └── di.ts                   # Symbol-based injection tokens
│       └── repositories/
│           ├── index.ts
│           └── {module}-prisma.repository.ts  # Implements I{Module}Repository
├── package.json
├── tsconfig.json
└── rolldown.config.mjs
```

**Layer Responsibilities:**

1. **Domain Layer** (`/domain`) - Business rules and contracts
   - **entities/**: Domain entity types with Zod schemas for runtime validation
   - **interfaces/**: Abstract contracts for repository and service
   - **schemas/**: Request/response DTOs using `nestjs-zod` with OpenAPI decorators
   - NO framework dependencies, NO external system calls

2. **Application Layer** (`/application`) - Business logic orchestration
   - **services/**: Implement service interfaces, depend on repository abstractions
   - Orchestrate domain logic, pagination, error handling
   - Maps repository data to service responses
   - Throws domain exceptions (NotFoundException, etc.)
   - **CRITICAL: NO @Injectable() decorator** - Application services must be plain TypeScript classes
   - **CRITICAL: NO NestJS decorators** - Framework-independent business logic

3. **Infrastructure Layer** (`/infras`) - Framework-specific implementations
   - **repositories/**: Implement repository interfaces with Prisma
   - **di/**: Symbol-based DI tokens (e.g., `PRODUCT_REPOSITORY`)
   - Handle Prisma exceptions and type mapping
   - Direct database/external service calls
   - **CRITICAL: NO @Injectable() decorator** - Infrastructure implementations must be plain TypeScript classes

4. **Module** (`{module}.module.ts`) - NestJS wiring
   - Import dependencies (DatabaseModule, etc.)
   - Register services and repositories with DI
   - Export service for controller injection

**Dependency Flow:**

```
Domain (contracts) ← Application (orchestration) ← Infrastructure (implementation)
                                                 ↑
                                            Module (DI wiring)
                                                 ↑
                                          Controller (api-server)
                                          Processor (worker)
```

### Monitoring & Metrics (Epic 7)

Comprehensive monitoring and observability for workflow execution:

**Health Checks:**
- `GET /health` - Liveness probe (application running)
- `GET /health/ready` - Readiness probe (dependencies healthy)

**Metrics APIs:**
- `GET /api/workflows/metrics` - Aggregated statistics with time-series data
- `GET /api/workflows/runs/:runId/performance` - Step-level performance analysis
- `GET /metrics` - Prometheus-compatible metrics export

**Services (libs/workflow-core/application):**
- `HealthCheckService` - Liveness and readiness checks
- `WorkflowMetricsService` - Aggregated metrics calculation
- `WorkflowPerformanceService` - Performance stats with bottleneck detection
- `PrometheusMetricsService` - Prometheus format export

**Controllers:**
- `HealthController` (apps/api-server/src/health) - Health endpoints
- `WorkflowsController` (apps/api-server/src/workflows) - Metrics and performance endpoints
- `MetricsController` (apps/api-server/src/metrics) - Prometheus endpoint

**Key Features:**
- On-demand metrics computed from existing `workflow_runs` and `step_runs` tables
- Bottleneck detection for slow steps and retry patterns
- Prometheus integration for Grafana dashboards
- Performance targets: health <50ms, metrics <100ms, performance <150ms

All services are plain TypeScript classes (no `@Injectable()`) registered via DI tokens.

**Documentation:** See `/docs/monitoring-metrics-api.md` for complete API reference.

### Artifact Storage (Epic 16)

Workflow artifacts are stored in S3-compatible object storage (Floci for local development, AWS S3 for production):

**Storage Architecture:**
- **Database:** Metadata only (file path, S3 key, size, content type, timestamps)
- **S3:** Actual artifact content (on-demand fetching)
- **Repository:** `ArtifactS3Repository` in `libs/agent-runtime/src/infras/repositories/`

**API Endpoints:**
- `GET /api/organizations/:orgId/workflows/runs/:runId/artifacts` - List artifact metadata
- `GET /api/organizations/:orgId/workflows/runs/:runId/artifacts/:artifactId` - Get artifact with content

**Configuration (apps/api-server/.env):**
```bash
S3__ENDPOINT=http://localhost:4566
S3__REGION=us-east-1
S3__BUCKET=vyrak-artifacts
S3__ACCESS_KEY_ID=test
S3__SECRET_ACCESS_KEY=test
S3__FORCE_PATH_STYLE=true
```

**Key Features:**
- Content fetched from S3 only when explicitly requested (`includeContent: true`)
- S3 keys follow pattern: `{orgId}/{runId}/{filename}`
- Automatic content type detection
- Tenant isolation via organization ID in key path

**Local Development:**
- Uses Floci (lightweight S3-compatible storage via LocalStack)
- Setup: `yarn docker:floci && yarn floci:setup`
- Access: `aws --endpoint-url=http://localhost:4566 s3 ls s3://vyrak-artifacts`

### Tech Stack

**Backend:**

- NestJS with TypeScript 7.0
- Prisma ORM for PostgreSQL
- nestjs-zod for validation
- @nestjs/swagger for OpenAPI generation
- Rolldown for production builds

**Frontend:**

- React 19 with Vite
- TanStack Query (React Query v5) for data fetching
- React Hook Form + Zod for form validation
- Orval for generating type-safe React Query hooks from OpenAPI
- Axios with Bearer token interceptors

**DevOps:**

- Turborepo for monorepo management
- Docker Compose for local PostgreSQL
- Oxlint for fast linting
- Vitest for unit/integration testing
- Playwright for E2E testing
- Lefthook + Commitizen for git workflow
- GitHub Actions for CI/CD

### Build Configuration

The project uses shared base configurations to ensure consistency:

**Rolldown (Production Builds):**
- `config/rolldown.base.mjs` exports `createLibConfig()` and `createAppConfig()`
- Libs use: `import { createLibConfig } from '../../config/rolldown.base.mjs'`
- Apps use: `import { createAppConfig } from '../../config/rolldown.base.mjs'` with `appName` required

**TypeScript:**
- `config/tsconfig.base.json` - Base compiler options (strict mode, decorators, ES2022)
- `config/tsconfig.lib.json` - Extends base for libs (declaration output)
- `config/tsconfig.app.json` - Extends base for apps (noEmit for type checking only)
- All workspace packages extend one of these configs

## Development Workflow

### Type-Safe API Pattern

This project follows a strict type-safe workflow from backend to frontend:

1. **Backend:** Define Zod schemas and NestJS DTOs with OpenAPI decorators
2. **Generate OpenAPI:** Run `yarn generate:openapi` to create `openapi.yml`
3. **Generate Hooks:** Run `yarn generate:api` to create React Query hooks with Zod validation
4. **Frontend:** Use generated hooks with full TypeScript inference

**Example:**

```typescript
// Backend: apps/api-server/src/products/products.dto.ts
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
})
export class CreateProductDto extends createZodDto(CreateProductSchema) {}

// Frontend: Auto-generated hooks
const { mutateAsync } = useProductsControllerCreate()
```

### Key Commands

**Development:**

- `yarn dev` - Start all apps (API on :3000, Web on :5173)
- `yarn dev:api` / `yarn dev:web` / `yarn dev:worker` - Start individual apps

**API Generation:**

- `yarn generate:openapi` - Generate OpenAPI spec from NestJS
- `yarn generate:api` - Generate React Query hooks from OpenAPI spec

**Code Generation:**

- `yarn ctix` - Auto-generate index.ts exports for all modules (run after adding/removing files)

**Quality:**

- `yarn lint` - Auto-fix with Oxlint
- `yarn typecheck` - TypeScript check all packages
- `yarn test` - Run Vitest tests
- `yarn test:e2e` - Run E2E tests with Playwright

**Database:**

- `yarn db:generate` - Generate Prisma client
- `yarn db:migrate` - Run migrations
- `yarn db:push` - Push schema without migration

**Workspace Management:**

- `yarn workspace:list` - List all workspaces
- `yarn workspace:health --org-id <org> --project-id <project>` - Check workspace health

### Workspace Configuration

Vyrak supports two workspace modes for workflow execution:

**Clone Mode (Default):**
- Each workflow run clones the repository into an isolated workspace
- Safer for development, easier to debug
- Slower (30-60s) and uses more disk space (~500MB per run)

**Worktree Mode (Production):**
- Uses git worktree to create lightweight workspaces from a shared main repository
- 6-12x faster workspace creation (2-5s)
- 10x disk savings (~50MB per run)
- Ideal for production environments with many parallel workflows

**Configuration:**

Set workspace mode via environment variables in `apps/api-server/.env`:

```bash
# Workspace mode: 'clone' (default) or 'worktree'
WORKSPACE_MODE=clone

# Main repos path (for worktree mode)
MAIN_REPOS_PATH=/var/vyrak/repos

# Workspaces path
WORKSPACES_PATH=/tmp/vyrak-workspaces

# Cleanup configuration
WORKSPACE_CLEANUP_ON_SUCCESS=true
WORKSPACE_CLEANUP_ON_FAILURE=false

# Worktree-specific settings
WORKTREE_BASE_BRANCH=main
WORKTREE_BRANCH_PREFIX=workflow/
WORKTREE_AUTO_FETCH=true
WORKTREE_AUTO_CLEANUP_BRANCH=true
```

**Migration Guide:**

For detailed instructions on migrating to worktree mode, see `/docs/workspace-worktree-migration.md`.

**CLI Commands:**

```bash
# List all workspaces
yarn workspace:list

# List worktrees for specific org/project
yarn workspace:list --org-id org-123 --project-id project-456

# Check workspace health
yarn workspace:health --org-id org-123 --project-id project-456
```

## Code Conventions

### File Naming

- **kebab-case** for TypeScript files: `product-schema.ts`, `api-client.ts`
- **PascalCase** for React components: `ProductsPage.tsx`
- **kebab-case** for directories: `products/`, `lib/schemas/`

### Module Exports

- **DO NOT manually maintain `index.ts` files** - they are auto-generated
- Run `yarn ctix` to regenerate all `index.ts` barrel exports after adding/removing files
- The script processes `libs/` (full recursive exports) and `apps/` (subdirectories only)
- Ignored patterns: `*.spec.ts`, `*.test.ts`, `.{hidden}`, `typechains/`, `factories/`
- Ignored modules: `contracts`, `database`, `web`

### Import Order

Using `@ianvs/prettier-plugin-sort-imports`:

1. Node built-ins (`crypto`, `path`)
2. External packages (`@nestjs/*`, `react`)
3. Internal packages (`@vyrak/*`)
4. Relative imports (`./`, `../`)

### TypeScript

- **Strict mode enabled** with TypeScript 7.0
- **moduleResolution: bundler** (no baseUrl)
- **Explicit return types** for public methods
- **Type imports** with `import type` when possible
- **Zod schemas** for runtime validation

### NestJS API

- Use `nestjs-zod` for DTOs with OpenAPI decorators
- Export interfaces from services for controller return types
- Use `@ApiProperty()` with explicit `type`, `nullable`, `required` for nullable fields
- Return ISO string dates from services (not Date objects)
- Use conventional HTTP status codes

### React

- **React 19** features enabled
- **React Hook Form** with `zodResolver` for all forms
- **TanStack Query** for server state management
- **useEffect** for side effects (don't call hooks in render body)
- Extract reusable logic into custom hooks

### Styling

- Dark theme with stepped tonal surfaces: `#05070C` → `#1E2636`
- Accent color: `#38BDF8` (cyan)
- CSS Grid for layout, Flexbox for components
- Token-based design system with CSS custom properties
- Fully rounded geometry (999px pills, 50% circles)

## Important Rules

### When Making Changes

1. **Read before modifying** - Always read existing files to understand patterns
2. **Match existing style** - Follow the project's conventions and patterns
3. **Follow hexagonal architecture** - Create new business modules in `libs/` following the `libs/product/` pattern
4. **Controllers and processors belong in apps/** - Only controllers go in `api-server/`, only processors/consumers in `worker/`
5. **DO NOT manually edit index.ts files** - Run `yarn ctix` to regenerate barrel exports
6. **Regenerate API** - After changing DTOs/controllers, run `yarn ctix` then `yarn generate:openapi` then `yarn generate:api`
7. **Never write manual React Query hooks** - Use generated hooks from Orval in `apps/web/src/api/generated/`
8. **Verify types** - Run `yarn typecheck` before claiming completion
9. **Update docs** - Update relevant docs when changing architecture or workflows
10. **NEVER use @Injectable() in libs/** - Services, repositories, and use cases in `libs/` MUST be plain TypeScript classes without any NestJS decorators. Only `apps/` code (controllers, processors) and `*.module.ts` files can use NestJS decorators

### When Adding Features

1. **Create business module in libs/** - All new domain modules go in `libs/{module-name}/` following hexagonal architecture
2. **Follow the product module pattern** - Use `libs/product/` as reference implementation
3. **Structure layers correctly**:
   - Domain layer: entities (Zod schemas), interfaces, DTOs with OpenAPI decorators - **NO NestJS decorators**
   - Application layer: service implementation with business logic - **NO @Injectable(), plain TypeScript classes**
   - Infrastructure layer: repository implementation (Prisma), DI tokens - **NO @Injectable(), plain TypeScript classes**
   - Module: NestJS module with DI wiring - **ONLY place for @Module() decorator**
4. **Add controller to api-server** - Create lightweight controller in `apps/api-server/src/{module}/` that injects and calls the service from `libs/{module}/`
5. **Add processor to worker (if needed)** - Create processor/consumer in `apps/worker/src/{module}/` for background jobs
6. **Use shared base configs**:
   - Rolldown: `import { createLibConfig } from '../../config/rolldown.base.mjs'` for libs, `createAppConfig({ appName: 'app-name' })` for apps
   - TypeScript: Extend `../../config/tsconfig.lib.json` for libs, `../../config/tsconfig.app.json` for apps
   - See `config/README.md` for detailed documentation
7. **Run code generation**:
   - `yarn ctix` - Regenerate index.ts barrel exports
   - `yarn generate:openapi` - Generate OpenAPI spec
   - `yarn generate:api` - Generate React Query hooks
8. **Use generated hooks** - NEVER write React Query hooks manually, always use Orval-generated hooks from `apps/web/src/api/generated/`
9. **Frontend validation** - Add Zod schemas in `lib/schemas/` for form validation only (not for API calls)
10. **Test endpoints** - Verify API works before integrating frontend
11. **Update examples** - Keep product CRUD as reference implementation

### When Debugging

1. **Check types first** - Most issues are TypeScript errors
2. **Verify OpenAPI** - Check `apps/api-server/openapi.yml` for correct schemas
3. **Inspect network** - Use browser DevTools to see actual API requests
4. **Check React Query** - Use React Query DevTools for cache inspection
5. **Review logs** - Check console and server logs for errors

## Common Pitfalls

### Module Organization

- **Business logic in api-server**: DO NOT put services, repositories, or business logic in `apps/api-server/`. They belong in `libs/{module}/`
- **Controllers in libs**: DO NOT put controllers in libs. Controllers are HTTP adapters and belong in `apps/api-server/src/{module}/`
- **Missing layers**: Always implement all three layers (domain, application, infrastructure) for consistency
- **Direct Prisma in services**: Services should depend on repository interfaces, NOT Prisma directly
- **@Injectable() in libs**: NEVER use `@Injectable()` decorator in `libs/` code. Services, repositories, and use cases MUST be plain TypeScript classes. Only `apps/` controllers/processors and `*.module.ts` files can use NestJS decorators

### OpenAPI Generation

- **Nullable types**: Use `@ApiProperty({ type: String, nullable: true })` not `@ApiPropertyOptional()`
- **Return types**: Export interfaces and add explicit return types to prevent TS4053 errors
- **Date serialization**: Return ISO strings from services, not Date objects

### React Patterns

- **Infinite loops**: Never call state setters or form.reset() directly in render body, use useEffect
- **Query keys**: Include dependencies in queryKey for React Query to refetch on changes
- **Form defaults**: Reset forms in useEffect when data changes, not in render

### TypeScript 7.0

- **No baseUrl**: All paths must be relative with `./` or use workspace packages
- **moduleResolution: bundler**: Required for TypeScript 7.0
- **Explicit exports**: Export types/interfaces that are used in public APIs

## Environment Setup

### Required

- Node.js >= 22.0.0
- Yarn >= 1.22.0
- Docker & Docker Compose

### Environment Files

**apps/api-server/.env:**

```env
NODE_ENV=development
PORT=3000
DATABASE__URL=postgresql://postgres:postgres@localhost:5432/vyrak
```

**apps/web/.env:**

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Testing Strategy

### Test Structure

Tests are split into two categories to optimize CI speed and developer workflow:

**Unit Tests** (`*.spec.ts`, `*.test.ts` excluding `*.integration.*`):
- Fast, isolated tests with no external dependencies (5-10 seconds total)
- Run in CI on every push/PR
- No database, Redis, or external services required
- Mock external dependencies
- Commands:
  - `yarn test:unit` - Run once
  - `yarn test:unit:watch` - Watch mode
  - `yarn test:ci` - CI mode with coverage

**Integration Tests** (`*.integration.spec.ts`, `*.integration.test.ts`, `**/__tests__/integration/**`):
- Real database and Redis connections via Testcontainers
- Run on-demand or scheduled (nightly builds)
- Use PostgreSQL 17 and Redis 7 Docker containers
- Each test file gets isolated database instance
- Commands:
  - `yarn test:integration` - Run once
  - `yarn test:integration:watch` - Watch mode

### Writing Tests

**Unit Test Pattern:**
```typescript
// product.service.spec.ts
import { describe, it, expect, vi } from 'vitest'

describe('ProductService', () => {
  it('should create product', () => {
    const mockRepo = { create: vi.fn() }
    const service = new ProductService(mockRepo)
    // Test with mocks
  })
})
```

**Integration Test Pattern:**
```typescript
// product.repository.integration.spec.ts
import { getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

describe('ProductRepository Integration', () => {
  let prisma: PrismaClient
  let repository: ProductRepository

  beforeAll(async () => {
    try {
      await startPostgres()
      prisma = getPrismaClient()
      repository = new ProductRepository(prisma)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await stopPostgres()
  })

  it('should create product in real database', async () => {
    if (!prisma) return // Skip if setup failed
    
    const product = await repository.create({ name: 'Test' })
    expect(product.id).toBeDefined()
  })
})
```

### CI/CD Integration

**Main CI Workflow** (`.github/workflows/ci.yml`):
- Runs on every push/PR to main/develop
- Executes unit tests only (fast feedback)
- No service containers needed
- Generates coverage reports

**Integration Tests Workflow** (`.github/workflows/integration-tests.yml`):
- Runs on push/PR to main/develop
- Uses PostgreSQL 17 and Redis 7 service containers
- Runs database migrations before tests
- Takes longer but provides end-to-end validation

### Running Tests Locally

**Development:**
```bash
# Unit tests (fast, no Docker needed)
yarn test:unit              # Run once
yarn test:unit:watch        # Watch mode

# Integration tests (requires Docker)
yarn test:integration       # Run once
yarn test:integration:watch # Watch mode

# All tests
yarn test                   # Run everything
yarn test:watch             # Watch all
```
**CI:**
- Unit tests run automatically on all PRs/pushes
- Integration tests run on push/PR to main/develop branches
- Coverage reports uploaded to Codecov

### E2E Tests

E2E test suite using **Playwright Test** for critical user flows.

**Location:** `apps/e2e/`

**Test Coverage:**
- Authentication flows (login, register, session persistence, auth guards)
- Dashboard access and navigation
- 23 test cases total

**Running Tests:**
```bash
# All tests (headless)
yarn test:e2e

# With browser visible
yarn test:e2e:headed

# Interactive UI mode
yarn test:e2e:ui

# Debug mode
yarn test:e2e:debug

# View reports
yarn workspace @vyrak/e2e test:report
```

**Setup:**
1. Install Playwright browsers: `yarn workspace @vyrak/e2e install:browsers`
2. Seed test user: `yarn db:seed:test`
3. Start dev servers: `yarn dev`
4. Run tests

**Architecture:**
- **Page Objects:** Organized by domain (auth, dashboard)
- **Fixtures:** Reusable auth setup with storage state
- **Helpers:** API helpers for test data, storage helpers for localStorage
- **Test Data:** Faker.js for generating unique test data

**CI Integration:**
- Tests run automatically on PR and push to main
- Uses GitHub Actions with PostgreSQL service container
- HTML reports uploaded as artifacts
- Single worker for stability, chromium only

## Documentation

### Keep Updated

- `README.md` - Setup and getting started
- `CLAUDE.md` (this file) - AI agent guidance
- `AGENTS.md` - OpenCode specific instructions
- `docs/openapi-orval-setup.md` - API generation workflow

### Reference

- `libs/product/` - Reference implementation for hexagonal architecture
- NestJS: https://docs.nestjs.com
- Prisma: https://www.prisma.io/docs
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/overview
- Orval: https://orval.dev
- React Hook Form: https://react-hook-form.com

## Git Workflow

### Commits

- Use `yarn commit` for interactive Commitizen
- Follow conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Keep commits atomic and focused

### Branches

- `main` - Stable production code
- `develop` - Integration branch (if needed)
- `feat/*` - Feature branches
- `fix/*` - Bug fix branches

### Pre-commit Hooks

Lefthook manages git hooks with these checks:

- **pre-commit**: Runs `yarn ci:lint` and `yarn ci:format` on staged files
- **commit-msg**: Validates commit message format with commitlint
- **pre-push**: Runs `yarn ci:typecheck` before pushing

To skip hooks temporarily: `LEFTHOOK=0 git commit`

## Performance Considerations

### Backend

- Use Prisma select to fetch only needed fields
- Implement pagination for list endpoints
- Cache frequently accessed data
- Use database indexes appropriately

### Frontend

- Code split with React.lazy() and Suspense
- Optimize React Query staleTime and cacheTime
- Use React.memo for expensive components
- Lazy load images and heavy dependencies

### Build

- Turborepo caching for faster builds
- Rolldown for optimized production bundles
- Minimize bundle size with tree-shaking

## Workspace Management

### Workspace Modes

Vyrak supports two workspace modes for workflow execution:

**Clone Mode (Default):**
- Each workflow run clones the repository into an isolated workspace
- Simple and safe for development
- Slower (30-60s per workspace) and uses more disk (~500MB per run)

**Worktree Mode (Production):**
- Uses git worktree to create lightweight workspaces from a shared main repository
- 6-12x faster (2-5s per workspace) and 10x more disk efficient (~50MB per run)
- Ideal for production environments with concurrent workflows

### Configuration

Set workspace mode via environment variables in `apps/api-server/.env`:

```bash
# Workspace mode: 'clone' (default) or 'worktree' (production)
WORKSPACE_MODE=clone

# For worktree mode
MAIN_REPOS_PATH=/var/vyrak/repos
WORKTREE_AUTO_FETCH=true
WORKTREE_AUTO_CLEANUP_BRANCH=true
```

See `docs/workspace-worktree-migration.md` for full configuration options and migration guide.

### CLI Commands

```bash
# List all workspaces
yarn workspace:list

# Check main repo health
yarn workspace:health --org-id <org> --project-id <project>
```

### When to Use Each Mode

- **Development:** Use clone mode (default) for simpler debugging
- **Staging/Production:** Use worktree mode for performance and efficiency
- **CI/CD:** Use worktree mode for parallel workflow execution

## Security Notes

- Bearer tokens stored in localStorage (consider httpOnly cookies for production)
- Validate all inputs with Zod schemas
- Use parameterized queries (Prisma handles this)
- Sanitize error messages before sending to client
- Keep dependencies updated regularly

## Deployment Checklist

- [ ] Run `yarn build` to verify production builds
- [ ] Run `yarn typecheck` and `yarn lint:ci`
- [ ] Run database migrations with `yarn db:migrate:deploy`
- [ ] Set production environment variables
- [ ] Configure CORS for production domains
- [ ] Enable rate limiting and security headers
- [ ] Setup monitoring and logging
- [ ] Configure backup strategy for database

## Support & Resources

- Project documentation: `./docs/`
- API documentation: http://localhost:3000/api (when API server is running)
- Issue tracking: GitHub Issues
- Team chat: (configure your team's chat)

---

_Last updated: 2026-10-25_
_For OpenCode-specific instructions, see AGENTS.md_
