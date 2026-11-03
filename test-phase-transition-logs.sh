#!/bin/bash

# Test Phase Transition by monitoring logs
echo "🧪 Monitoring Event-Driven Phase Transition"
echo "==========================================="
echo ""
echo "This will monitor logs in real-time."
echo "In another terminal, approve a Tech Refinement phase via browser:"
echo "  http://localhost:5173/organizations/.../workflows/..."
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""
sleep 3

# Monitor worker logs for phase transition events
echo "📋 Monitoring worker logs for phase.approved events..."
echo "--------------------------------------------------------"
tail -f apps/worker/*.log 2>/dev/null || tail -f ~/.pm2/logs/*.log 2>/dev/null || echo "No log file found, checking Redis..."

# Alternative: check Redis streams
echo ""
echo "📋 Checking Redis Streams..."
docker exec vyrak-redis redis-cli XINFO STREAM events:phase.approved 2>/dev/null || echo "Stream not created yet"
