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
│   ├── api-server/     # NestJS REST API with OpenAPI
│   ├── web/            # React + Vite frontend
│   └── worker/         # BullMQ background worker
├── libs/
│   ├── custom-config/  # Environment configuration
│   ├── custom-logger/  # Logging utilities
│   ├── database/       # Prisma ORM client
│   └── shared/         # Shared utilities and types
└── docs/               # Documentation
```

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
- Vitest for testing
- Husky + Commitizen for git workflow

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

**Quality:**
- `yarn lint` - Auto-fix with Oxlint
- `yarn typecheck` - TypeScript check all packages
- `yarn test` - Run Vitest tests

**Database:**
- `yarn db:generate` - Generate Prisma client
- `yarn db:migrate` - Run migrations
- `yarn db:push` - Push schema without migration

## Code Conventions

### File Naming
- **kebab-case** for TypeScript files: `product-schema.ts`, `api-client.ts`
- **PascalCase** for React components: `ProductsPage.tsx`
- **kebab-case** for directories: `products/`, `lib/schemas/`

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
3. **Regenerate API** - After changing DTOs/controllers, run both generation scripts
4. **Verify types** - Run `yarn typecheck` before claiming completion
5. **Update docs** - Update relevant docs when changing architecture or workflows

### When Adding Features

1. **Backend first** - Start with NestJS DTOs and OpenAPI decorators
2. **Generate types** - Run `yarn generate:openapi` then `yarn generate:api`
3. **Frontend validation** - Add Zod schemas in `lib/schemas/` for form validation
4. **Test endpoints** - Verify API works before integrating frontend
5. **Update examples** - Keep product CRUD as reference implementation

### When Debugging

1. **Check types first** - Most issues are TypeScript errors
2. **Verify OpenAPI** - Check `apps/api-server/openapi.yml` for correct schemas
3. **Inspect network** - Use browser DevTools to see actual API requests
4. **Check React Query** - Use React Query DevTools for cache inspection
5. **Review logs** - Check console and server logs for errors

## Common Pitfalls

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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vyrak
```

**apps/web/.env:**
```env
VITE_API_BASE_URL=http://localhost:3000
```

## Testing Strategy

### Unit Tests
- Vitest for all packages
- Mock database calls in services
- Test business logic, not framework code

### Integration Tests
- Test API endpoints with real HTTP requests
- Use test database (separate from development)
- Clean up test data after each test

### E2E Tests
- Test critical user flows
- Use Playwright or Cypress (to be added)
- Run against staging environment

## Documentation

### Keep Updated
- `README.md` - Setup and getting started
- `CLAUDE.md` (this file) - AI agent guidance
- `AGENTS.md` - OpenCode specific instructions
- `docs/openapi-orval-setup.md` - API generation workflow

### Reference
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
- Oxlint auto-fix
- Prettier formatting
- TypeScript type checking (recommended to add)

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

*Last updated: 2026-10-23*
*For OpenCode-specific instructions, see AGENTS.md*
