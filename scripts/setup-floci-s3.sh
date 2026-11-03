#!/usr/bin/env bash

set -e

# Load configuration from .env if exists
ENV_FILE="apps/api-server/.env"
if [ -f "$ENV_FILE" ]; then
  echo "📄 Loading configuration from $ENV_FILE"
  # Export S3 config from .env
  export $(grep -E '^S3__' "$ENV_FILE" | xargs)
fi

# Configuration - map S3__ prefix to script variables
ENDPOINT="${S3__ENDPOINT:-${S3_ENDPOINT:-http://localhost:4566}}"
REGION="${S3__REGION:-${S3_REGION:-us-east-1}}"
BUCKET="${S3__BUCKET:-${S3_BUCKET:-vyrak-artifacts}}"
AWS_ACCESS_KEY_ID="${S3__ACCESS_KEY_ID:-${S3_ACCESS_KEY_ID:-test}}"
AWS_SECRET_ACCESS_KEY="${S3__SECRET_ACCESS_KEY:-${S3_SECRET_ACCESS_KEY:-test}}"

echo "🚀 Setting up Floci S3..."
echo "Endpoint: $ENDPOINT"
echo "Region: $REGION"
echo "Bucket: $BUCKET"
echo "Credentials: [configured]"

# Wait for Floci to be ready
echo "⏳ Waiting for Floci to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -s "$ENDPOINT/_localstack/health" > /dev/null 2>&1; then
    echo "✅ Floci is ready"
    break
  fi

  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Floci failed to start after $max_attempts attempts"
    exit 1
  fi

  echo "Attempt $attempt/$max_attempts - waiting..."
  sleep 2
done

# Check if AWS CLI is available (local or Docker)
USE_DOCKER=false
if ! command -v aws &> /dev/null; then
  echo "ℹ️  AWS CLI not found locally, will use Docker"
  USE_DOCKER=true
  # Check if Docker is available
  if ! command -v docker &> /dev/null; then
    echo "❌ Neither AWS CLI nor Docker is available"
    echo "   Install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    echo "   Or install Docker: https://docs.docker.com/get-docker/"
    exit 1
  fi
fi

# Function to run AWS command
run_aws() {
  if [ "$USE_DOCKER" = true ]; then
    docker run --rm --network host \
      -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
      -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
      amazon/aws-cli "$@"
  else
    AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    aws "$@"
  fi
}

# Create S3 bucket
echo "📦 Creating S3 bucket: $BUCKET"
if run_aws --endpoint-url="$ENDPOINT" --region="$REGION" s3 mb "s3://$BUCKET" 2>/dev/null; then
  echo "✅ Bucket created successfully"
else
  echo "ℹ️  Bucket already exists or creation skipped"
fi

# Verify bucket creation
echo "🔍 Verifying bucket..."
run_aws --endpoint-url="$ENDPOINT" --region="$REGION" s3 ls | grep "$BUCKET" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Bucket '$BUCKET' verified"
else
  echo "⚠️  Could not verify bucket"
fi

echo ""
echo "✅ Floci S3 setup complete!"
echo ""
echo "Configuration:"
echo "  Endpoint: $ENDPOINT"
echo "  Region: $REGION"
echo "  Bucket: $BUCKET"
echo "  Credentials: [configured]"
