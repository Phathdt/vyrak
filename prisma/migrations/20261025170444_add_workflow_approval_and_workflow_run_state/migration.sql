-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by_user_id" TEXT,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "workflow_approvals" (
    "id" TEXT NOT NULL,
    "workflow_run_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "plan_artifact_id" TEXT NOT NULL,
    "plan_artifact_hash" TEXT NOT NULL,
    "decided_by_user_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "comment" TEXT,
    "invalidated_at" TIMESTAMP(3),
    "invalidation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_approvals_workflow_run_id_key" ON "workflow_approvals"("workflow_run_id");

-- CreateIndex
CREATE INDEX "workflow_approvals_workflow_run_id_idx" ON "workflow_approvals"("workflow_run_id");

-- CreateIndex
CREATE INDEX "workflow_approvals_status_idx" ON "workflow_approvals"("status");

-- CreateIndex
CREATE INDEX "workflow_approvals_created_at_idx" ON "workflow_approvals"("created_at");

-- CreateIndex
CREATE INDEX "workflow_runs_state_idx" ON "workflow_runs"("state");

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
