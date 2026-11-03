-- Add unique constraint to prevent duplicate sessions for same workflow and phase
-- This fixes CRITICAL-05: Session Creation Race Condition

-- First, remove any duplicate sessions (keep the oldest one)
DELETE FROM conversation_sessions a USING (
  SELECT MIN(ctid) as ctid, workflow_id, phase
  FROM conversation_sessions
  GROUP BY workflow_id, phase
  HAVING COUNT(*) > 1
) b
WHERE a.workflow_id = b.workflow_id
  AND a.phase = b.phase
  AND a.ctid <> b.ctid;

-- Add unique constraint
CREATE UNIQUE INDEX "conversation_sessions_workflow_id_phase_key" ON "conversation_sessions"("workflow_id", "phase");
