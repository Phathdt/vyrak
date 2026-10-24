#!/bin/bash

# Load environment variables from apps/api-server/.env
if [ -f "apps/api-server/.env" ]; then
  export $(cat apps/api-server/.env | grep -v '^#' | xargs)
fi

# Parse DATABASE_URL
# Expected format: postgresql://user:password@host:port/database
if [ -z "$DATABASE__URL" ]; then
  echo "Error: DATABASE__URL not set"
  exit 1
fi

# Extract connection details from DATABASE__URL
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE__URL

# Remove protocol
DB_URL_NO_PROTO=${DB_URL#postgresql://}

# Extract user:password@host:port/database
USER_PASS_HOST=${DB_URL_NO_PROTO%/*}
DB_NAME=${DB_URL_NO_PROTO##*/}

# Extract user:password and host:port
USER_PASS=${USER_PASS_HOST%@*}
HOST_PORT=${USER_PASS_HOST#*@}

# Extract user and password
DB_USER=${USER_PASS%%:*}
DB_PASSWORD=${USER_PASS#*:}

# Extract host and port
DB_HOST=${HOST_PORT%%:*}
DB_PORT=${HOST_PORT#*:}

echo "Seeding database: $DB_NAME at $DB_HOST:$DB_PORT"

# Run psql with extracted credentials
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f prisma/seed.sql
