# =============================================================================
# Stage 1: Builder - Build the application
# =============================================================================
FROM node:24.16.0-alpine3.21 AS builder
WORKDIR /app

# Install build dependencies
RUN apk update && apk add --no-cache git

# Copy package files for dependency installation
COPY package.json yarn.lock ./
COPY apps/web/package.json ./apps/web/

# Install ALL dependencies (including dev) for building
RUN yarn install --frozen-lockfile

# Copy source code and configuration
COPY apps/web ./apps/web
COPY tsconfig.json ./

# Build the application
WORKDIR /app/apps/web
RUN yarn build

# =============================================================================
# Stage 2: Runtime - Nginx to serve static files
# =============================================================================
FROM nginx:alpine

# Copy built application from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
