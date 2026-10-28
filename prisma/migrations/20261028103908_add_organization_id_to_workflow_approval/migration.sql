-- AlterTable: Add organization_id to workflow_approvals
-- This migration adds the organizationId field to workflow_approvals table
-- and backfills it from the related workflow_runs table

-- Step 1: Add the column as nullable TEXT first
ALTER TABLE "workflow_approvals" ADD COLUMN "organization_id" TEXT;

-- Step 2: Backfill organization_id from workflow_runs
UPDATE "workflow_approvals" wa
SET "organization_id" = wr."organization_id"
FROM "workflow_runs" wr
WHERE wa."workflow_run_id" = wr."id";

-- Step 3: Make the column NOT NULL after backfill
ALTER TABLE "workflow_approvals" ALTER COLUMN "organization_id" SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE "workflow_approvals"
  ADD CONSTRAINT "workflow_approvals_organization_id_fkey"
  FOREIGN KEY ("organization_id")
  REFERENCES "organizations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Step 5: Add index for better query performance
CREATE INDEX "workflow_approvals_organization_id_idx" ON "workflow_approvals"("organization_id");
