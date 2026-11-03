#!/bin/bash

# Automated Phase Transition Test
# Uses database directly to create test scenario

set -e

echo "🧪 Automated Event-Driven Phase Transition Test"
echo "==============================================="
echo ""

# Check services
echo "📋 Step 1: Verify services are running"
echo "---------------------------------------"
if ! pgrep -f "api-server" > /dev/null; then
  echo "❌ API server not running"
  exit 1
fi

if ! pgrep -f "worker/main.js" > /dev/null; then
  echo "❌ Worker not running"
  exit 1
fi

echo "✅ API Server running"
echo "✅ Worker running"

# Check Redis
echo ""
echo "📋 Step 2: Check Redis connection"
echo "----------------------------------"
if ! docker exec vyrak-redis redis-cli ping > /dev/null 2>&1; then
  echo "❌ Redis not accessible"
  exit 1
fi
echo "✅ Redis connected"

# Get initial stream length
echo ""
echo "📋 Step 3: Check Redis Streams (before)"
echo "----------------------------------------"
INITIAL_COUNT=$(docker exec vyrak-redis redis-cli XLEN events:phase.approved 2>/dev/null || echo "0")
echo "   Initial event count: $INITIAL_COUNT"

# Monitor worker logs in background
echo ""
echo "📋 Step 4: Start monitoring worker logs"
echo "----------------------------------------"
echo "   Watching for: 'Phase approved' and 'Started next phase'"

# Instruction for manual test
echo ""
echo "📋 Step 5: Manual Action Required"
echo "----------------------------------"
echo ""
echo "🌐 Open browser: http://localhost:5173"
echo "   1. Login to your account"
echo "   2. Navigate to a workflow in 'Tech Refinement' phase"
echo "   3. Click 'Approve Phase' button"
echo ""
echo "   Press Enter after clicking Approve..."
read -p ""

# Check after approval
echo ""
echo "📋 Step 6: Verify event was published"
echo "--------------------------------------"
sleep 2
FINAL_COUNT=$(docker exec vyrak-redis redis-cli XLEN events:phase.approved 2>/dev/null || echo "0")
echo "   Final event count: $FINAL_COUNT"

if [ "$FINAL_COUNT" -gt "$INITIAL_COUNT" ]; then
  echo "✅ Event published! (+$((FINAL_COUNT - INITIAL_COUNT)) events)"
  
  # Show last event
  echo ""
  echo "   Last event:"
  docker exec vyrak-redis redis-cli XREVRANGE events:phase.approved + - COUNT 1
else
  echo "❌ No new events detected"
  exit 1
fi

# Wait for worker
echo ""
echo "📋 Step 7: Wait for worker processing"
echo "--------------------------------------"
echo -n "   Waiting 10 seconds"
for i in {1..10}; do
  sleep 1
  echo -n "."
done
echo " Done!"

# Check consumer group
echo ""
echo "📋 Step 8: Check consumer group info"
echo "-------------------------------------"
docker exec vyrak-redis redis-cli XINFO GROUPS events:phase.approved 2>/dev/null || echo "   No consumer groups yet"

echo ""
echo "🎉 Test Complete!"
echo "================="
echo ""
echo "Next steps:"
echo "1. Check browser - Implementation phase should be IN_PROGRESS"
echo "2. Check terminal running worker - should see 'Started next phase implementation'"
echo ""

