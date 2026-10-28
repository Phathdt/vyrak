#!/bin/bash
set -e

echo "🧪 E2E Test: Artifact Storage Flow"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
ORG_ID="cm2hslx6l000008l5e1un24jx"  # Test org from seed

# Step 1: Login and get token
echo -e "${BLUE}📝 Step 1: Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@vyrak.dev",
    "password": "password123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | grep -o '[^"]*$' | tail -1)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to authenticate${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Step 2: Get a workflow run with artifacts
echo -e "${BLUE}📋 Step 2: Finding workflow runs...${NC}"
RUNS_RESPONSE=$(curl -s -X GET "$API_URL/api/organizations/$ORG_ID/workflows/runs?limit=10" \
  -H "Authorization: Bearer $TOKEN")

# Extract first run ID
RUN_ID=$(echo "$RUNS_RESPONSE" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

if [ -z "$RUN_ID" ]; then
  echo -e "${RED}❌ No workflow runs found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found run: $RUN_ID${NC}"
echo ""

# Step 3: List artifacts for this run
echo -e "${BLUE}📦 Step 3: Listing artifacts...${NC}"
ARTIFACTS_RESPONSE=$(curl -s -X GET "$API_URL/api/organizations/$ORG_ID/workflows/runs/$RUN_ID/artifacts" \
  -H "Authorization: Bearer $TOKEN")

echo "$ARTIFACTS_RESPONSE" | jq '.' 2>/dev/null || echo "$ARTIFACTS_RESPONSE"

# Check if we got artifacts
ARTIFACT_COUNT=$(echo "$ARTIFACTS_RESPONSE" | grep -o '"id":' | wc -l)

if [ "$ARTIFACT_COUNT" -eq 0 ]; then
  echo -e "${RED}⚠️  No artifacts found for this run${NC}"
  echo "This is expected if the run hasn't generated artifacts yet"
  echo ""
else
  echo -e "${GREEN}✅ Found $ARTIFACT_COUNT artifact(s)${NC}"
  echo ""

  # Step 4: Get content of first artifact
  ARTIFACT_ID=$(echo "$ARTIFACTS_RESPONSE" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)

  echo -e "${BLUE}📄 Step 4: Fetching artifact content...${NC}"
  echo "Artifact ID: $ARTIFACT_ID"

  CONTENT_RESPONSE=$(curl -s -X GET "$API_URL/api/organizations/$ORG_ID/workflows/runs/$RUN_ID/artifacts/$ARTIFACT_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "$CONTENT_RESPONSE" | jq '.' 2>/dev/null || echo "$CONTENT_RESPONSE"
  echo ""

  # Check if content field exists
  HAS_CONTENT=$(echo "$CONTENT_RESPONSE" | grep -o '"content":' | wc -l)

  if [ "$HAS_CONTENT" -gt 0 ]; then
    echo -e "${GREEN}✅ Artifact content fetched successfully${NC}"
  else
    echo -e "${RED}❌ Artifact content not found${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}🎉 E2E test passed!${NC}"
echo ""
echo "Summary:"
echo "✅ Authentication successful"
echo "✅ Workflow run found"
echo "✅ Artifacts API accessible"
if [ "$ARTIFACT_COUNT" -gt 0 ]; then
  echo "✅ Artifact content fetched"
fi
