/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,idempotency_key]` on the table `workflow_runs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `initiated_by_user_id` to the `workflow_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workflow_key` to the `workflow_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workflow_version` to the `workflow_runs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "cancel_requested_at" TIMESTAMP(3),
ADD COLUMN     "current_step_key" TEXT,
ADD COLUMN     "error_code" TEXT,
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "initiated_by_user_id" TEXT NOT NULL,
ADD COLUMN     "input" JSONB,
ADD COLUMN     "workflow_key" TEXT NOT NULL,
ADD COLUMN     "workflow_version" TEXT NOT NULL,
ALTER COLUMN "started_at" DROP NOT NULL,
ALTER COLUMN "started_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "workflow_step_runs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB,
    "output" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_step_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "step_run_id" TEXT,
    "sequence" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_step_runs_run_id_idx" ON "workflow_step_runs"("run_id");

-- CreateIndex
CREATE INDEX "workflow_step_runs_organization_id_idx" ON "workflow_step_runs"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_step_runs_status_idx" ON "workflow_step_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_step_runs_run_id_step_key_attempt_key" ON "workflow_step_runs"("run_id", "step_key", "attempt");

-- CreateIndex
CREATE INDEX "workflow_events_run_id_idx" ON "workflow_events"("run_id");

-- CreateIndex
CREATE INDEX "workflow_events_organization_id_idx" ON "workflow_events"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_events_event_type_idx" ON "workflow_events"("event_type");

-- CreateIndex
CREATE INDEX "workflow_events_created_at_idx" ON "workflow_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_events_run_id_sequence_key" ON "workflow_events"("run_id", "sequence");

-- CreateIndex
CREATE INDEX "workflow_runs_initiated_by_user_id_idx" ON "workflow_runs"("initiated_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_org_idempotency_key" ON "workflow_runs"("organization_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_runs" ADD CONSTRAINT "workflow_step_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_step_run_id_fkey" FOREIGN KEY ("step_run_id") REFERENCES "workflow_step_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
