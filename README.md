# Vyrak

A comprehensive TypeScript monorepo boilerplate for building professional full-stack applications with OpenAPI + Orval type-safe API integration.

## Features:

- 🏗️ **Turborepo Monorepo** - High-performance build system with caching
- 🔥 **TypeScript 7.0** - Latest TypeScript with strict mode
- 🚀 **NestJS API Server** - REST API with OpenAPI/Swagger documentation
- ⚛️ **React + Vite Frontend** - Modern React 19 with fast HMR
- 🔄 **Type-Safe API Client** - Auto-generated React Query hooks with Zod validation
- 🎨 **Dark Theme UI** - Polished interface with stepped tonal surfaces
- 🔐 **Authentication Ready** - Bearer token auth with axios interceptors
- 📦 **Shared Libraries** - Custom config, logger, database, and utilities
- 🐳 **Docker Support** - Docker Compose for PostgreSQL
- ✅ **Modern Tooling** - Oxlint, Oxfmt, Lefthook, Commitizen

## Architecture

```
vyrak/
├── apps/
│   ├── api-server/     # NestJS REST API with OpenAPI
│   ├── web/            # React + Vite frontend
│   └── worker/         # Background job worker
├── libs/
│   ├── custom-config/  # Configuration management
│   ├── custom-logger/  # Logging utilities
│   ├── database/       # Prisma database client
│   └── shared/         # Shared utilities and types
└── docs/               # Project documentation
```

## Tech Stack

### Backend

- **NestJS** - Progressive Node.js framework
- **Prisma** - Type-safe database ORM
- **nestjs-zod** - Zod validation for DTOs
- **@nestjs/swagger** - OpenAPI documentation generation
- **Rolldown** - Fast bundler for production builds

### Frontend

- **React 19** - Latest React with new features
- **Vite** - Next-generation frontend tooling
- **TanStack Query (React Query)** - Powerful async state management
- **React Hook Form** - Performant form validation
- **Zod** - TypeScript-first schema validation
- **Orval** - OpenAPI to React Query code generator
- **Axios** - HTTP client with interceptors

### DevOps & Tooling

- **Turborepo** - Monorepo build system
- **TypeScript 7.0** - Static type checking
- **Oxlint** - Blazing fast linter
- **Oxfmt** - Fast code formatter with import sorting
- **Vitest** - Fast unit test framework
- **Docker** - Containerization
- **MailCrab** - Email testing tool for development
- **Lefthook** - Fast and powerful git hooks manager
- **Commitizen** - Conventional commits

## Prerequisites

- Node.js >= 22.0.0
- Yarn >= 1.22.0
- Docker & Docker Compose (for PostgreSQL)

## Getting Started

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd vyrak

# Install dependencies
yarn install

# Start PostgreSQL with Docker
yarn docker:up
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Update the following required variables in .env:
# - MAIN_REPOS_PATH: Path to main git repository for worktree mode
# - DATABASE__URL: PostgreSQL connection string
# - REDIS_URL: Redis connection string
```

**Important Environment Variables:**

- `WORKSPACE_MODE`: Must be set to `worktree` (only mode supported)
- `MAIN_REPOS_PATH`: **Required** - Path where the primary git repository is located
- `WORKSPACES_PATH`: Path for temporary worktrees (default: `/tmp/vyrak-workspaces`)
- `WORKSPACE_CLEANUP_ON_SUCCESS`: Auto-cleanup worktrees after success (default: `true`)
- `WORKSPACE_CLEANUP_ON_FAILURE`: Auto-cleanup worktrees after failure (default: `false`)

See `.env.example` for complete configuration options.

### 3. Database Setup

```bash
# Generate Prisma client
yarn db:generate

# Run migrations
yarn db:migrate

# (Optional) Open Prisma Studio
yarn db:studio
```

### 4. Development

```bash
# Start all applications
yarn dev

# Or start individually
yarn dev:api      # API server on http://localhost:3000
yarn dev:web      # Web app on http://localhost:5173
yarn dev:worker   # Background worker
```

### 5. Generate API Client

```bash
# Generate OpenAPI spec from NestJS
yarn generate:openapi

# Generate React Query hooks from OpenAPI spec
yarn generate:api
```

## Available Scripts

### Development

- `yarn dev` - Start all apps in development mode
- `yarn dev:api` - Start API server only
- `yarn dev:web` - Start web app only
- `yarn dev:worker` - Start worker only

### Build

- `yarn build` - Build all packages
- `yarn build:prod` - Production build with optimizations

### API Generation

- `yarn generate:openapi` - Generate OpenAPI spec from NestJS controllers
- `yarn generate:api` - Generate React Query hooks from OpenAPI spec

### Testing

- `yarn test` - Run all tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:ci` - Run tests with coverage for CI

### Code Quality

- `yarn lint` - Lint and auto-fix with Oxlint
- `yarn lint:ci` - Lint without fixing (for CI)
- `yarn typecheck` - Type check all packages
- `yarn format` - Format code with Prettier

### Database

- `yarn db:generate` - Generate Prisma client
- `yarn db:push` - Push schema to database
- `yarn db:migrate` - Create and run migrations
- `yarn db:studio` - Open Prisma Studio

### Docker

- `yarn docker:up` - Start all containers (PostgreSQL, Redis, MailCrab)
- `yarn docker:down` - Stop all containers
- `yarn docker:logs` - View container logs
- `yarn docker:ps` - List running containers

### Workspace Management

- `yarn workspace:list` - List all workspaces
- `yarn workspace:health --org-id <org> --project-id <project>` - Check workspace health

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE__URL=postgresql://postgres:postgres@localhost:5433/vyrak

# Workspace mode (clone or worktree)
WORKSPACE_MODE=clone
MAIN_REPOS_PATH=/var/vyrak/repos

# Authentication
JWT_SECRET=your-secret-key-here

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Workspace Modes

Vyrak supports two workspace modes for workflow execution:

- **Clone Mode (Default)** - Each workflow run clones the repository. Simple and safe for development.
- **Worktree Mode (Production)** - Uses git worktree for 6-12x faster workspace creation and 10x less disk usage.

For production deployments, enable worktree mode:

```bash
WORKSPACE_MODE=worktree
MAIN_REPOS_PATH=/var/vyrak/repos
```

See `docs/workspace-worktree-migration.md` for detailed configuration and migration guide.

## Development Services

When you run `yarn docker:up`, the following services will be available:

- **PostgreSQL** - Database on `localhost:5433`
- **Redis** - Cache and queue on `localhost:6379`
- **MailCrab** - Email testing tool
  - Web interface: http://localhost:1080
  - SMTP server: `localhost:1025`

### Using MailCrab

MailCrab is an email testing tool that captures all emails sent during development:

1. Configure your application to send emails to `localhost:1025`
2. Open http://localhost:1080 in your browser to view captured emails
3. No authentication required - all emails are visible in the web interface

Example SMTP configuration:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@vyrak.local
```

### Git

- `yarn commit` - Interactive commit with Commitizen
- `yarn prepare` - Setup Lefthook git hooks

## Type-Safe API Workflow

This project uses a complete type-safe workflow from backend to frontend:

1. **Define NestJS DTOs** with `nestjs-zod` and Zod schemas
2. **Generate OpenAPI spec** from NestJS controllers with decorators
3. **Generate React Query hooks** from OpenAPI spec with Orval
4. **Use type-safe hooks** in React components with full TypeScript support

### Example: Products CRUD

**Backend (NestJS):**

```typescript
// products.dto.ts
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().default(0),
})

export class CreateProductDto extends createZodDto(CreateProductSchema) {}

// products.controller.ts
@Controller('products')
export class ProductsController {
  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto)
  }
}
```

**Frontend (React):**

```typescript
// Auto-generated by Orval
import { useProductsControllerCreate } from './api/generated/products/products'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema } from './lib/schemas/product-schema'

function CreateProduct() {
  const form = useForm({
    resolver: zodResolver(createProductSchema),
  })

  const createMutation = useProductsControllerCreate()

  const onSubmit = async (data) => {
    await createMutation.mutateAsync({ data })
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

## Environment Variables

### API Server (.env in apps/api-server/)

```env
NODE_ENV=development
PORT=3000
DATABASE__URL=postgresql://postgres:postgres@localhost:5432/vyrak
```

### Web App (.env in apps/web/)

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Project Structure Details

### Apps

#### api-server

NestJS REST API with OpenAPI documentation. Includes:

- Product CRUD example with pagination
- OpenAPI spec generation script
- nestjs-zod for validation
- Custom config, logger, and database modules

#### web

React + Vite frontend with:

- Auto-generated React Query hooks
- React Hook Form with Zod validation
- Dark theme UI with custom design system
- Bearer token authentication

#### worker

Background job processor with BullMQ (ready for implementation)

### Libs

#### custom-config

Environment configuration management with validation

#### custom-logger

Enhanced logging with NestJS integration

#### database

Prisma client with generated types

#### shared

Shared utilities, decorators, and types

## Design System

The UI uses a dark theme with stepped tonal surfaces:

- **Base colors**: `#05070C`, `#0A0D12`, `#0F131C`, `#161D2B`, `#1E2636`
- **Accent**: `#38BDF8` (bright cyan)
- **Typography**: Fluid clamp() scaling, tight tracking on headings
- **Layout**: CSS Grid-first, rounded geometry (999px pills, 50% circles)
- **Components**: Token-based spacing, radius, and shadows

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `yarn lint` and `yarn typecheck`
4. Commit with `yarn commit` (Commitizen)
5. Submit a pull request

## License

MIT

---

**Built with ❤️ for professional TypeScript development**
