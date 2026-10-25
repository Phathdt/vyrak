# =============================================================================
# Stage 1: Builder - Build the application
# =============================================================================
FROM node:24.16.0-alpine3.21 AS builder
WORKDIR /app

# Install build dependencies
RUN apk update && apk add --no-cache gcc musl-dev git

# Copy package files for dependency installation
COPY package.json yarn.lock ./
COPY apps/worker/package.json ./apps/worker/
COPY libs/custom-config/package.json ./libs/custom-config/
COPY libs/custom-logger/package.json ./libs/custom-logger/
COPY libs/database/package.json ./libs/database/
COPY libs/shared/package.json ./libs/shared/

# Install ALL dependencies (including dev) for building
RUN yarn install --frozen-lockfile

# Copy source code and configuration
COPY . .

# Generate Prisma client and build
RUN yarn prisma generate
RUN yarn turbo build:prod --filter=@apps/worker

# Generate flattened production package.json with all dependencies from app + libs
RUN node scripts/collect-deps.js worker package > /tmp/prod-package.json

# =============================================================================
# Stage 2: Deps - Install and clean production dependencies
# =============================================================================
FROM node:24.16.0-alpine3.21 AS deps
WORKDIR /app

# Copy flattened production package.json
COPY --from=builder /tmp/prod-package.json ./package.json
COPY yarn.lock ./

# Install production dependencies
RUN yarn install --production --ignore-scripts && \
  yarn cache clean

# Remove unnecessary transitive dependencies that aren't needed at runtime
RUN rm -rf node_modules/@angular-devkit \
  node_modules/@schematics \
  node_modules/@esbuild \
  node_modules/@swc \
  node_modules/typescript \
  node_modules/@types

# =============================================================================
# Stage 3: Runtime - Final minimal image
# =============================================================================
FROM node:24.16.0-alpine3.21
WORKDIR /app

# Install only essential runtime packages
RUN apk add --no-cache dumb-init

# Copy cleaned production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the generated Prisma client from builder
COPY --from=builder /app/libs/database/src/generated ./libs/database/src/generated

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy built libs to node_modules/@vyrak for proper module resolution
RUN mkdir -p /app/node_modules/@vyrak && \
  cp -r /app/dist/libs/* /app/node_modules/@vyrak/

# Copy tsconfig.json for tsconfig-paths to resolve path aliases at runtime
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create symlink for path resolution
RUN ln -s /app/dist /dist

# Copy Prisma schema and config (required for migrations)
COPY --from=builder /app/prisma ./prisma

CMD ["dumb-init", "node", "dist/apps/worker/main.js"]
