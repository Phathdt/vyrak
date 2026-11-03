#!/bin/bash

# Check Event Flow Status
echo "🔍 Checking Event-Driven Phase Transition Status"
echo "================================================"
echo ""

# Check Redis Streams
echo "📋 Redis Streams Status"
echo "-----------------------"
STREAM_LENGTH=$(docker exec vyrak-redis redis-cli XLEN events:phase.approved 2>/dev/null || echo "0")
echo "events:phase.approved: $STREAM_LENGTH events"

if [ "$STREAM_LENGTH" -gt 0 ]; then
  echo ""
  echo "Last 3 events:"
  docker exec vyrak-redis redis-cli XREVRANGE events:phase.approved + - COUNT 3
  
  echo ""
  echo "Consumer groups:"
  docker exec vyrak-redis redis-cli XINFO GROUPS events:phase.approved 2>/dev/null || echo "No consumer groups"
fi

# Check worker logs
echo ""
echo "📋 Recent Worker Logs (last 50 lines)"
echo "--------------------------------------"
echo "Looking for phase transition activity..."
docker logs --tail 50 $(docker ps --filter "name=worker" --format "{{.ID}}" 2>/dev/null | head -1) 2>/dev/null || \
  journalctl -u worker --no-pager -n 50 2>/dev/null || \
  echo "No Docker/systemd worker logs found"

echo ""
echo "📋 Process Status"
echo "-----------------"
echo "Worker process:"
ps aux | grep -E "worker/main.js" | grep -v grep | awk '{print "  PID: "$2" | CPU: "$3"% | MEM: "$4"%"}'

echo ""
echo "API Server process:"
ps aux | grep -E "api-server/main.js" | grep -v grep | awk '{print "  PID: "$2" | CPU: "$3"% | MEM: "$4"%"}'

