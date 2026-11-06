# =============================================================================
# Migrate image: runs `prisma migrate deploy` once and exits.
# Split from the api-server image so the api does not ship the Prisma CLI.
# =============================================================================
FROM node:24.16.0-alpine AS deps
WORKDIR /app

ENV PNPM_HOME=/pnpm \
  PATH=/pnpm:$PATH \
  CI=true

RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Only prisma + dotenv (what prisma.config.ts imports), at the versions pinned in the root package.json
COPY package.json /tmp/root-package.json
RUN node -e "const r=require('/tmp/root-package.json');const d=r.dependencies||{};const v=r.devDependencies||{};const pick=n=>d[n]||v[n];require('fs').writeFileSync('package.json',JSON.stringify({name:'migrate',version:'1.0.0',private:true,dependencies:{prisma:pick('prisma'),dotenv:pick('dotenv')}},null,2))"

COPY pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store --location=global && \
  pnpm install --prod --no-frozen-lockfile

# The CLI needs @prisma/dev and @prisma/studio-core to load, but not their UI bundles or local-dev runtime assets.
# Query compiler wasm for databases other than PostgreSQL is never used.
RUN cd /app/node_modules/.pnpm && \
  rm -rf typescript@* @electric-sql+pglite@* react@* react-dom@* elkjs@* && \
  rm -rf @prisma+studio-core@*/node_modules/@prisma/studio-core/dist/ui && \
  rm -f @prisma+studio-core@*/node_modules/@prisma/studio-core/dist/metafile-*.json && \
  rm -rf @prisma+dev@*/node_modules/@prisma/dev/dist/runtime-assets && \
  rm -rf effect@*/node_modules/effect/src && \
  find . -type f -name 'query_compiler_*_bg.*' \
  \( -name '*sqlite*' -o -name '*mysql*' -o -name '*sqlserver*' -o -name '*cockroachdb*' \) -delete

RUN find /app/node_modules -type f \
  \( -name '*.map' -o -name '*.md' -o -name '*.markdown' -o -name '*.d.ts' -o -name '*.d.cts' -o -name '*.d.mts' -o -name '*.tsbuildinfo' \) \
  -delete

# =============================================================================
# Runtime
# =============================================================================
FROM node:24.16.0-alpine
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init

COPY --from=deps /app/node_modules ./node_modules

# Schema, config and migrations
COPY prisma/schema.prisma prisma/prisma.config.ts ./prisma/
COPY prisma/migrations ./prisma/migrations

ENTRYPOINT ["dumb-init", "./node_modules/.bin/prisma"]
CMD ["migrate", "deploy", "--config=prisma/prisma.config.ts"]
