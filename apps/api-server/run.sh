#!/usr/bin/env sh
set -e

echo "Start server..."

echo "Running migrations..."
./node_modules/.bin/prisma migrate deploy --config=prisma/prisma.config.ts
echo "Running migrations successful."

node /app/dist/apps/api-server/main.js
