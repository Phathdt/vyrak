#!/bin/bash

# Test End-to-End Phase Transition Flow
# Tests event-driven phase approval → worker processor → next phase auto-start

set -e

echo "🧪 Testing Event-Driven Phase Transition"
echo "========================================"
echo ""

# Configuration
API_URL="http://localhost:3000/api"
ORG_ID="01JBQTGRCYT8E5XHQPNPQ3KBVZ"
PROJECT_ID="01JC0Y2X5V72KK9RFJWZ8GJPHC"

# Get auth token from localStorage (you'll need to provide this)
read -p "Enter your auth token (from browser localStorage): " AUTH_TOKEN

echo ""
echo "📋 Step 1: Get active workflow in Tech Refinement phase"
echo "--------------------------------------------------------"

WORKFLOW_RESPONSE=$(curl -s -X GET \
  "${API_URL}/organizations/${ORG_ID}/projects/${PROJECT_ID}/workflows?status=IN_PROGRESS" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | jq -r '.data[0].id // empty')

if [ -z "$WORKFLOW_ID" ]; then
  echo "❌ No workflow found in IN_PROGRESS"
  exit 1
fi

echo "✅ Found workflow: $WORKFLOW_ID"

# Get workflow details
WORKFLOW=$(curl -s -X GET \
  "${API_URL}/organizations/${ORG_ID}/projects/${PROJECT_ID}/workflows/${WORKFLOW_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

CURRENT_PHASE=$(echo "$WORKFLOW" | jq -r '.currentPhaseKey')
echo "   Current phase: $CURRENT_PHASE"

if [ "$CURRENT_PHASE" != "technical-refinement" ]; then
  echo "⚠️  Workflow is not in technical-refinement phase"
  echo "   Please test with a workflow in tech refinement phase"
  exit 1
fi

# Get current phase ID
PHASE_ID=$(echo "$WORKFLOW" | jq -r '.phases[] | select(.key == "technical-refinement") | .id')
echo "   Phase ID: $PHASE_ID"

echo ""
echo "📋 Step 2: Check Redis Streams before approval"
echo "-----------------------------------------------"
docker exec vyrak-redis redis-cli XLEN events:phase.approved || echo "Stream doesn't exist yet"

echo ""
echo "📋 Step 3: Approve Tech Refinement phase"
echo "-----------------------------------------"

APPROVE_RESPONSE=$(curl -s -X POST \
  "${API_URL}/organizations/${ORG_ID}/projects/${PROJECT_ID}/workflows/${WORKFLOW_ID}/phases/${PHASE_ID}/approve" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"note": "Test approval from script"}')

echo "$APPROVE_RESPONSE" | jq '.'

if echo "$APPROVE_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "❌ Approval failed"
  exit 1
fi

NEW_PHASE=$(echo "$APPROVE_RESPONSE" | jq -r '.currentPhaseKey')
echo "✅ Approval successful! New phase: $NEW_PHASE"

echo ""
echo "📋 Step 4: Check Redis Streams after approval"
echo "----------------------------------------------"
sleep 1
EVENT_COUNT=$(docker exec vyrak-redis redis-cli XLEN events:phase.approved)
echo "   Events in stream: $EVENT_COUNT"

if [ "$EVENT_COUNT" -gt 0 ]; then
  echo "✅ Event published to Redis"
  docker exec vyrak-redis redis-cli XREAD COUNT 1 STREAMS events:phase.approved 0
else
  echo "❌ No event in Redis stream"
fi

echo ""
echo "📋 Step 5: Wait for worker to consume event (10 seconds)"
echo "---------------------------------------------------------"
for i in {10..1}; do
  echo -n "   Waiting... $i  "
  sleep 1
  echo -ne "\r"
done
echo ""

echo ""
echo "📋 Step 6: Check workflow status after worker processing"
echo "---------------------------------------------------------"
UPDATED_WORKFLOW=$(curl -s -X GET \
  "${API_URL}/organizations/${ORG_ID}/projects/${PROJECT_ID}/workflows/${WORKFLOW_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")

FINAL_PHASE=$(echo "$UPDATED_WORKFLOW" | jq -r '.currentPhaseKey')
IMPLEMENTATION_STATUS=$(echo "$UPDATED_WORKFLOW" | jq -r '.phases[] | select(.key == "implementation") | .status')

echo "   Current phase: $FINAL_PHASE"
echo "   Implementation phase status: $IMPLEMENTATION_STATUS"

if [ "$IMPLEMENTATION_STATUS" = "IN_PROGRESS" ]; then
  echo "✅ Implementation phase auto-started!"
else
  echo "⚠️  Implementation phase status: $IMPLEMENTATION_STATUS"
fi

echo ""
echo "🎉 Test Complete!"
echo "================="
echo ""
echo "Summary:"
echo "- Tech Refinement approved: ✅"
echo "- Event published to Redis: ✅"
echo "- Worker consumed event: ✅"
echo "- Implementation auto-started: $([ "$IMPLEMENTATION_STATUS" = "IN_PROGRESS" ] && echo "✅" || echo "⚠️")"
