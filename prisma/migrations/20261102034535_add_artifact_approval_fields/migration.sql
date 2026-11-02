-- AlterTable
ALTER TABLE "artifacts" ADD COLUMN     "approval_status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "superseded_by" TEXT;

-- AlterTable
ALTER TABLE "workflow_work_items" ADD COLUMN     "assigned_agent_role" TEXT,
ADD COLUMN     "dependency_type" TEXT NOT NULL DEFAULT 'INDEPENDENT',
ADD COLUMN     "execution_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "phase_id" TEXT;

-- CreateIndex
CREATE INDEX "artifacts_organization_id_workflow_id_approval_status_idx" ON "artifacts"("organization_id", "workflow_id", "approval_status");

-- CreateIndex
CREATE INDEX "workflow_work_items_organization_id_phase_id_idx" ON "workflow_work_items"("organization_id", "phase_id");
