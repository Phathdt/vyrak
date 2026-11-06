# =============================================================================
# Stage 1: Builder - Build the application
# =============================================================================
FROM node:24.16.0-alpine AS builder
WORKDIR /app

ENV PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH \
  CI=true \
  LEFTHOOK=0

# Install build dependencies
RUN apk update && apk add --no-cache gcc musl-dev git

RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Fetch packages into the store using only the lockfile (cached until it changes)
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store --location=global && \
  pnpm fetch

# Copy source code and configuration
COPY . .

# Root "prepare" runs lefthook, which needs a git repo (.git is excluded from the context)
RUN git init -q

# Install workspace dependencies for the worker (plus root tooling such as turbo)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --offline \
  --filter "@apps/worker..." --filter .

# Generate Prisma client and build
RUN pnpm db:generate
RUN pnpm exec turbo run build:prod --filter=@apps/worker

# Source maps are never loaded at runtime (no --enable-source-maps)
RUN find dist -type f -name '*.map' -delete

# Generate flattened production package.json with all dependencies from app + libs
RUN node scripts/collect-deps.js worker package > /tmp/prod-package.json

# The worker never runs migrations (prisma CLI) and never loads test helpers (testcontainers)
RUN node -e "const fs=require('fs');const f='/tmp/prod-package.json';const p=JSON.parse(fs.readFileSync(f,'utf8'));for(const d of ['prisma','@testcontainers/postgresql'])delete p.dependencies[d];fs.writeFileSync(f,JSON.stringify(p,null,2))"

# =============================================================================
# Stage 2: Deps - Install production dependencies only
# =============================================================================
FROM node:24.16.0-alpine AS deps
WORKDIR /app

ENV PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH \
  CI=true

RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Flattened package.json + the workspace lockfile (keeps resolved versions pinned)
COPY --from=builder /tmp/prod-package.json ./package.json
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store --location=global && \
  pnpm install --prod --no-frozen-lockfile

# Drop files that are never read at runtime
RUN find /app/node_modules -type f \
  \( -name '*.map' -o -name '*.md' -o -name '*.markdown' -o -name '*.d.ts' -o -name '*.d.cts' -o -name '*.d.mts' -o -name '*.tsbuildinfo' \) \
  -delete

# =============================================================================
# Stage 3: Runtime - Final minimal image
# =============================================================================
FROM node:24.16.0-alpine
WORKDIR /app

ENV NODE_ENV=production

# Runtime packages: git and gh clone, push and open PRs on an empty disk (no token is baked in)
RUN apk add --no-cache dumb-init git github-cli ca-certificates

# Writable locations for the repo cache and per-run worktrees (mount a volume here)
RUN mkdir -p /var/vyrak/repos /var/vyrak/workspaces && chown -R node:node /var/vyrak

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# The SDK is bundled into main.js, so it looks for its native claude binary package next to the top-level
# packages. pnpm only links that optional package inside the SDK's own store folder, so expose it here.
RUN for p in /app/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-linux-*/node_modules/@anthropic-ai/claude-agent-sdk-linux-*; do \
  ln -s "$p" /app/node_modules/@anthropic-ai/; \
  done

# Copy the generated Prisma client from builder
COPY --from=builder /app/libs/database/src/generated ./libs/database/src/generated

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy tsconfig.json for tsconfig-paths to resolve path aliases at runtime
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create symlink for path resolution
RUN ln -s /app/dist /dist

# YAML configuration files read by CustomConfigService (APP_ENV selects the file)
COPY --from=builder /app/config ./config

USER node

CMD ["dumb-init", "node", "dist/apps/worker/main.js"]
