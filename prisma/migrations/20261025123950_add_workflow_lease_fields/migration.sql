-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "last_heartbeat_at" TIMESTAMP(3),
ADD COLUMN     "lease_expires_at" TIMESTAMP(3),
ADD COLUMN     "lease_owner_id" TEXT;

-- CreateIndex
CREATE INDEX "workflow_runs_lease_expires_at_idx" ON "workflow_runs"("lease_expires_at");

-- CreateIndex
CREATE INDEX "workflow_runs_last_heartbeat_at_idx" ON "workflow_runs"("last_heartbeat_at");
