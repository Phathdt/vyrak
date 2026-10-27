-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "completed_stories" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "current_story_id" TEXT,
ADD COLUMN     "failed_stories" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "template_id" TEXT,
ADD COLUMN     "template_key" VARCHAR(50),
ADD COLUMN     "total_stories" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "workflow_step_runs" ADD COLUMN     "completed_story_ids" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "current_story_id" TEXT,
ADD COLUMN     "phase_key" VARCHAR(50),
ADD COLUMN     "requires_approval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "story_based" BOOLEAN NOT NULL DEFAULT true,
    "phases" JSONB NOT NULL,
    "estimated_duration_min" INTEGER,
    "estimated_duration_max" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "workflow_run_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "acceptance_criteria" JSONB,
    "estimated_duration" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "error" TEXT,
    "artifacts" JSONB,
    "sub_steps" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_key_key" ON "workflow_templates"("key");

-- CreateIndex
CREATE INDEX "workflow_templates_key_idx" ON "workflow_templates"("key");

-- CreateIndex
CREATE INDEX "workflow_templates_is_active_idx" ON "workflow_templates"("is_active");

-- CreateIndex
CREATE INDEX "stories_workflow_run_id_idx" ON "stories"("workflow_run_id");

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE INDEX "stories_workflow_run_id_order_index_idx" ON "stories"("workflow_run_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "unique_story_order" ON "stories"("workflow_run_id", "order_index");

-- CreateIndex
CREATE INDEX "workflow_runs_template_id_idx" ON "workflow_runs"("template_id");

-- CreateIndex
CREATE INDEX "workflow_runs_current_story_id_idx" ON "workflow_runs"("current_story_id");

-- CreateIndex
CREATE INDEX "workflow_step_runs_phase_key_idx" ON "workflow_step_runs"("phase_key");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
