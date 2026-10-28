#!/usr/bin/env bash

set -e

# Configuration
ENDPOINT="${S3_ENDPOINT:-http://localhost:4566}"
REGION="${S3_REGION:-us-east-1}"
BUCKET="${S3_BUCKET:-vyrak-artifacts}"
AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-test}"
AWS_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-test}"

echo "🚀 Setting up Floci S3..."
echo "Endpoint: $ENDPOINT"
echo "Region: $REGION"
echo "Bucket: $BUCKET"

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

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
  echo "⚠️  AWS CLI not found. Bucket creation skipped."
  echo "    Install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
  echo "    Or use Docker: docker run --rm -it amazon/aws-cli --endpoint-url=$ENDPOINT s3 mb s3://$BUCKET"
  echo ""
  echo "✅ Floci is running and ready to use!"
  exit 0
fi

# Create S3 bucket
echo "📦 Creating S3 bucket: $BUCKET"
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
aws --endpoint-url="$ENDPOINT" \
    --region="$REGION" \
    s3 mb "s3://$BUCKET" 2>/dev/null || echo "Bucket already exists"

# Verify bucket creation
echo "🔍 Verifying bucket..."
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
aws --endpoint-url="$ENDPOINT" \
    --region="$REGION" \
    s3 ls

echo "✅ Floci S3 setup complete!"
echo ""
echo "You can now use S3 with:"
echo "  Endpoint: $ENDPOINT"
echo "  Region: $REGION"
echo "  Bucket: $BUCKET"
echo "  Access Key ID: $AWS_ACCESS_KEY_ID"
echo "  Secret Access Key: $AWS_SECRET_ACCESS_KEY"
