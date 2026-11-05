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

# Generate flattened production package.json with all dependencies from app + libs
RUN node scripts/collect-deps.js worker package > /tmp/prod-package.json

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

# =============================================================================
# Stage 3: Runtime - Final minimal image
# =============================================================================
FROM node:24.16.0-alpine
WORKDIR /app

ENV NODE_ENV=production

# Install only essential runtime packages
RUN apk add --no-cache dumb-init

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

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

# Copy Prisma schema and config (required for migrations)
COPY --from=builder /app/prisma ./prisma

CMD ["dumb-init", "node", "dist/apps/worker/main.js"]
