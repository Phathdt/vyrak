# Manual Test Guide: Event-Driven Phase Transition

## Prerequisites
✅ API Server running on port 3000
✅ Worker running (check with `ps aux | grep worker`)
✅ Redis running (check with `docker ps | grep redis`)

---

## Test Steps

### 1️⃣ Open Multiple Terminal Windows

**Terminal 1: Monitor Worker Logs**
```bash
# Watch worker output for phase transition events
cd /home/phathdt/Data/Dev/vyrak
# Worker logs should be visible in the terminal where you ran `yarn dev:worker`
```

**Terminal 2: Monitor Redis Streams**
```bash
# Check Redis events in real-time
watch -n 1 'docker exec vyrak-redis redis-cli XLEN events:phase.approved'
```

**Terminal 3: This Terminal**
Stay here to verify results.

---

### 2️⃣ Perform Test in Browser

1. **Open:** http://localhost:5173
2. **Login** with your account
3. **Navigate** to a workflow in **Tech Refinement** phase
   - Example URL pattern: `/organizations/{orgId}/projects/{projectId}/workflows/{workflowId}`
4. **Click "Approve Phase"** button

---

### 3️⃣ Expected Results

#### Immediately after clicking "Approve":

**✅ Browser Response (< 100ms):**
- Success toast message
- Phase status changes to "Completed"
- Current phase advances to "Implementation"

**✅ Terminal 2 (Redis):**
- Event count increases by 1
- Run to see event details:
```bash
docker exec vyrak-redis redis-cli XREVRANGE events:phase.approved + - COUNT 1
```

Expected event structure:
```
1) "1730000000000-0"
2) 1) "type"
   2) "phase.approved"
   3) "workflowId"
   4) "{workflow-id}"
   5) "phaseId"
   6) "{phase-id}"
   7) "phaseKey"
   8) "technical-refinement"
   9) "nextPhaseKey"
  10) "implementation"
  11) "metadata"
  12) "{\"orgId\":\"...\",\"projectId\":\"...\"}"
```

**✅ Terminal 1 (Worker Logs):**
Look for these log lines:
```
[PhaseTransitionWorker] Phase approved: orgId=... workflowId=... phaseId=... technical-refinement -> implementation
[PhaseTransitionWorker] Started next phase implementation: orgId=... workflowId=... phaseId=...
```

---

### 4️⃣ Verify Auto-Start

**Check Implementation Phase Status:**

In Terminal 3, run:
```bash
# Replace with your actual IDs
ORG_ID="01JBQTGRCYT8E5XHQPNPQ3KBVZ"
PROJECT_ID="01JC0Y2X5V72KK9RFJWZ8GJPHC"
WORKFLOW_ID="your-workflow-id"

curl -s "http://localhost:3000/api/organizations/${ORG_ID}/projects/${PROJECT_ID}/workflows/${WORKFLOW_ID}" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.phases[] | select(.key == "implementation") | {key, status}'
```

**Expected output:**
```json
{
  "key": "implementation",
  "status": "IN_PROGRESS"
}
```

✅ **Success!** Implementation phase auto-started via worker.

---

## Verification Checklist

- [ ] Approve button clicked successfully
- [ ] Browser shows phase transition (Tech Refinement → Implementation)
- [ ] Redis event count increased
- [ ] Worker logs show "Phase approved" message
- [ ] Worker logs show "Started next phase implementation"
- [ ] Implementation phase status = IN_PROGRESS
- [ ] No errors in worker logs

---

## If Something Goes Wrong

### No event in Redis
**Check:** API server logs for errors during publish
```bash
# In terminal where api-server is running, look for errors
```

### Worker not consuming
**Check:** Worker subscribed to events
```bash
# Worker should print on startup:
# "Subscribed to phase.approved events"
```

**Check:** Consumer group exists
```bash
docker exec vyrak-redis redis-cli XINFO GROUPS events:phase.approved
```

### Implementation not starting
**Check:** Worker logs for errors
```bash
# Look for error messages in worker terminal
# Should see specific error if startImplementation fails
```

---

## Quick Health Check Commands

```bash
# Redis stream length
docker exec vyrak-redis redis-cli XLEN events:phase.approved

# Last event
docker exec vyrak-redis redis-cli XREVRANGE events:phase.approved + - COUNT 1

# Consumer groups
docker exec vyrak-redis redis-cli XINFO GROUPS events:phase.approved

# Worker process
ps aux | grep "worker/main.js" | grep -v grep

# API server process
ps aux | grep "api-server/main.js" | grep -v grep
```

---

## Architecture Reminder

```
User → Browser → API Server → Redis Streams → Worker → Implementation Service
                     ↓
                  Returns 200 immediately
                  (non-blocking)
```

---

**Created:** 2026-11-03
**Event-driven phase transition implementation complete**
