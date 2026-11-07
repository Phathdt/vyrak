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

## Infrastructure Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser/Frontend<br/>React + Vite]
    end

    subgraph "API Layer"
        APIServer[API Server<br/>NestJS + REST]
        WSGateway[WebSocket Gateway<br/>Socket.IO + Redis]
    end

    subgraph "Processing Layer"
        Worker[Background Worker<br/>Event Consumer]
        AgentSDK[Agent SDK<br/>Claude AI]
    end

    subgraph "Storage Layer"
        PostgreSQL[(PostgreSQL<br/>Database)]
        Redis[(Redis<br/>Cache + Pub/Sub)]
        S3[S3/MinIO<br/>Artifacts]
    end

    subgraph "Message Queue"
        EventBus[Event Bus<br/>Redis Streams]
    end

    Browser -->|HTTP/REST| APIServer
    Browser <-->|WebSocket| WSGateway
    
    APIServer -->|Query/Write| PostgreSQL
    APIServer -->|Publish Events| EventBus
    APIServer -->|Stream Chat| AgentSDK
    
    WSGateway -->|Pub/Sub| Redis
    WSGateway -->|Publish Events| EventBus
    WSGateway -->|Stream Chat| AgentSDK
    
    EventBus -->|Consume Events| Worker
    Worker -->|Process Jobs| AgentSDK
    Worker -->|Query/Write| PostgreSQL
    Worker -->|Upload| S3
    
    AgentSDK -->|AI Processing| Worker
    AgentSDK -->|AI Streaming| WSGateway

    style Browser fill:#e1f5ff
    style APIServer fill:#fff4e6
    style WSGateway fill:#fff4e6
    style Worker fill:#e8f5e9
    style PostgreSQL fill:#f3e5f5
    style Redis fill:#f3e5f5
    style S3 fill:#f3e5f5
    style EventBus fill:#fff3e0
    style AgentSDK fill:#fce4ec
```

### Key Components

- **API Server**: REST endpoints with OpenAPI documentation
- **WebSocket Gateway**: Real-time bidirectional communication with Socket.IO
- **Event Bus**: Redis Streams for async event processing
- **Worker**: Background job processing (artifacts, analysis)
- **Agent SDK**: Claude AI integration for chat and code generation
- **Redis Adapter**: Multi-instance WebSocket scaling with Pub/Sub

### Data Flow

1. **REST API Flow**: `Browser → API Server → PostgreSQL`
2. **Real-time Chat**: `Browser ↔ WebSocket Gateway ↔ Agent SDK`
3. **Event Processing**: `Gateway/API → Event Bus → Worker → S3/PostgreSQL`
4. **Multi-instance WebSocket**: `Gateway ↔ Redis Pub/Sub ↔ Gateway (other instances)`

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
- pnpm >= 10
- Docker & Docker Compose (for PostgreSQL)

## Getting Started

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd vyrak

# Install dependencies
pnpm install

# Start PostgreSQL with Docker
pnpm docker:up
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Update the following required variables in .env:
# - MAIN_REPOS_PATH: Path to main git repository for worktree mode
# - DATABASE__URL: PostgreSQL connection string
# - REDIS__URL: Redis connection string (used by BullMQ, Socket.IO and the event bus)
# - GIT__GITHUB_APP__APP_ID, GIT__GITHUB_APP__INSTALLATION_ID, GIT__GITHUB_APP__PRIVATE_KEY (worker only): GitHub App credentials used to clone, push and open PRs
```

**Important Environment Variables:**

- `WORKSPACE_MODE`: Must be set to `worktree` (only mode supported)
- `MAIN_REPOS_PATH`: **Required** - Worker disk path where repositories are cloned automatically on first use
- `WORKSPACES_PATH`: Path for temporary worktrees (default: `/tmp/vyrak-workspaces`)
- `WORKSPACE_CLEANUP_ON_SUCCESS`: Auto-cleanup worktrees after success (default: `true`)
- `WORKSPACE_CLEANUP_ON_FAILURE`: Auto-cleanup worktrees after failure (default: `false`)
- `GIT__GITHUB_APP__*`: Worker only. GitHub App credentials (`APP_ID`, `INSTALLATION_ID`, `PRIVATE_KEY` or `PRIVATE_KEY_PATH`) used for clone, fetch, push and `gh pr create`; never written to `.git/config`. See `docs/github-app-setup.md`
- `GIT__USER_NAME` / `GIT__USER_EMAIL`: Worker only. Commit identity (default: `vyrak-bot`)
- `WORKER__CHAT_CONCURRENCY` / `WORKER__EXECUTION_CONCURRENCY`: Parallel chat turns (default 5) and phase runs (default 1) per worker process

See `.env.example` for complete configuration options.

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Open Prisma Studio
pnpm db:studio
```

### 4. S3 Storage Setup (Floci)

For local development, Vyrak uses Floci as an S3-compatible storage for workflow artifacts:

```bash
# Start Floci container and create S3 bucket
pnpm docker:floci
pnpm floci:setup
```

This will:
- Start the Floci container (lightweight S3-compatible storage)
- Automatically read S3 configuration from `apps/api-server/.env`
- Create the `vyrak-artifacts` bucket
- Verify the setup

**Configuration** (in `apps/api-server/.env`):
```bash
S3__ENDPOINT=http://localhost:4566
S3__REGION=us-east-1
S3__BUCKET=vyrak-artifacts
S3__ACCESS_KEY_ID=test
S3__SECRET_ACCESS_KEY=test
S3__FORCE_PATH_STYLE=true
```

**Available Commands:**
- `pnpm docker:floci` - Start Floci container
- `pnpm floci:setup` - Create S3 bucket (auto-detects AWS CLI or uses Docker)
- `pnpm floci:stop` - Stop Floci container

**Note:** For production, replace Floci with real AWS S3 and update the credentials in `.env`.

### 5. Development

```bash
# Start all applications
pnpm dev

# Or start individually
pnpm dev:api      # API server on http://localhost:3000
pnpm dev:web      # Web app on http://localhost:5173
pnpm dev:worker   # Background worker
```

### 6. Generate API Client

```bash
# Generate OpenAPI spec from NestJS
pnpm generate:openapi

# Generate React Query hooks from OpenAPI spec
pnpm generate:api
```

## Available Scripts

### Development

- `pnpm dev` - Start all apps in development mode
- `pnpm dev:api` - Start API server only
- `pnpm dev:web` - Start web app only
- `pnpm dev:worker` - Start worker only

### Build

- `pnpm build` - Build all packages
- `pnpm build:prod` - Production build with optimizations

### API Generation

- `pnpm generate:openapi` - Generate OpenAPI spec from NestJS controllers
- `pnpm generate:api` - Generate React Query hooks from OpenAPI spec

### Testing

- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ci` - Run tests with coverage for CI

### Code Quality

- `pnpm lint` - Lint and auto-fix with Oxlint
- `pnpm lint:ci` - Lint without fixing (for CI)
- `pnpm typecheck` - Type check all packages
- `pnpm format` - Format code with Prettier

### Database

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database
- `pnpm db:migrate` - Create and run migrations
- `pnpm db:studio` - Open Prisma Studio

### Docker

- `pnpm docker:up` - Start all containers (PostgreSQL, Redis, Floci, MailCrab)
- `pnpm docker:down` - Stop all containers
- `pnpm docker:logs` - View container logs
- `pnpm docker:ps` - List running containers
- `pnpm docker:floci` - Start Floci S3 container only
- `pnpm floci:setup` - Create S3 bucket (auto-detects AWS CLI or uses Docker)
- `pnpm floci:stop` - Stop Floci container

### Workspace Management

- `pnpm workspace:list` - List all workspaces
- `pnpm workspace:health --org-id <org> --project-id <project>` - Check workspace health

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

When you run `pnpm docker:up`, the following services will be available:

- **PostgreSQL** - `localhost:5433` - Primary database
- **Redis** - `localhost:6379` - Cache and session store
- **Floci** - `localhost:4566` - S3-compatible storage for artifacts (run `pnpm floci:setup` to create bucket)
- **MailCrab** - `localhost:1080` - Email testing interface

### Running API and Worker in Docker

`migrate`, `api` and `worker` are behind the `app` profile, so `pnpm docker:up` does not start them. To build and run them:

```bash
docker compose --profile app up -d --build
```

Set `JWT__SECRET`, `ANTHROPIC__API_KEY`, `ANTHROPIC__MODEL` and `ANTHROPIC__API_URL` in your shell or a root `.env` file; compose passes them to both containers. The `migrate` service (`prisma/Dockerfile`) runs `prisma migrate deploy` once and exits; `api` starts only after it completes successfully. In other environments, run the same image as a one-off job (for example a Kubernetes Job or a pre-deploy step) before rolling out the API. The API exposes `/healthz` on port 3000. `pnpm-workspace.yaml` sets `minimumReleaseAge: 0`, so pnpm installs packages regardless of how recently they were published. This applies to local installs, CI and the Docker images.

### Using Floci (S3 Storage)

Floci provides S3-compatible storage for local development:

1. Start Floci: `pnpm docker:floci`
2. Create bucket: `pnpm floci:setup`
3. Access artifacts at: `http://localhost:4566/vyrak-artifacts`

The setup script automatically reads configuration from `apps/api-server/.env` and uses Docker AWS CLI if local AWS CLI is not available.

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

- `pnpm commit` - Interactive commit with Commitizen
- `pnpm prepare` - Setup Lefthook git hooks

## Real-time Chat

Tech Refinement chat uses **WebSocket (Socket.IO)** for bidirectional real-time communication.

### Features
- Real-time message streaming with AI responses
- Typing indicators showing when users are typing
- Presence detection (user joined/left notifications)
- Connection status monitoring
- Multi-instance support via Redis adapter

### Setup

WebSocket chat requires Redis for pub/sub:

```bash
# Start Redis
pnpm docker:up

# Redis will be available at localhost:6379
```

Frontend configuration:

```bash
# apps/web/.env
VITE_API_BASE_URL=http://localhost:3000
```

### Architecture

```
Browser ↔ Socket.IO ↔ ChatGateway → ChatService → Event Bus → Workers
```

For detailed setup instructions, event documentation, and troubleshooting, see [WebSocket Setup Guide](docs/websocket-setup.md).

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
3. Run `pnpm lint` and `pnpm typecheck`
4. Commit with `pnpm commit` (Commitizen)
5. Submit a pull request

## License

MIT

---

**Built with ❤️ for professional TypeScript development**
