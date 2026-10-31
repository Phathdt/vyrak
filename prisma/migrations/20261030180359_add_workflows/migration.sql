-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "current_phase_key" TEXT,
    "definition_snapshot" JSONB,
    "classification" JSONB,
    "classification_confirmed_at" TIMESTAMP(3),
    "classification_confirmed_by_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_repositories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_phases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "config" JSONB,
    "input" JSONB,
    "output" JSONB,
    "error" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_work_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "acceptance_criteria" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "priority" TEXT,
    "estimate" JSONB,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_dependencies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "dependent_item_id" TEXT NOT NULL,
    "depends_on_item_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BLOCKS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "phase_id" TEXT,
    "work_item_id" TEXT,
    "parent_execution_id" TEXT,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "model" TEXT,
    "input" JSONB,
    "output" JSONB,
    "error" JSONB,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,6),
    "heartbeat_at" TIMESTAMP(3),
    "lease_expires_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "phase_id" TEXT,
    "agent_execution_id" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "phase_id" TEXT,
    "agent_execution_id" TEXT,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT,
    "s3_bucket" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "content_size" BIGINT,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_approvals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "proposal_artifact_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_by_id" TEXT NOT NULL,
    "decided_by_id" TEXT,
    "decision_note" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "phase_id" TEXT,
    "event_type" TEXT NOT NULL,
    "actor_type" TEXT,
    "actor_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "base_url" TEXT,
    "external_tenant_id" TEXT,
    "access_token_encrypted" TEXT,
    "refresh_token_encrypted" TEXT,
    "expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_publishes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_publishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_issue_mappings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "work_item_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "external_key" TEXT,
    "external_url" TEXT,
    "issue_type" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_issue_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflows_organization_id_project_id_status_idx" ON "workflows"("organization_id", "project_id", "status");

-- CreateIndex
CREATE INDEX "workflows_organization_id_status_idx" ON "workflows"("organization_id", "status");

-- CreateIndex
CREATE INDEX "workflows_organization_id_created_at_idx" ON "workflows"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_id_organization_id_key" ON "workflows"("id", "organization_id");

-- CreateIndex
CREATE INDEX "workflow_repositories_organization_id_idx" ON "workflow_repositories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_repositories_workflow_id_repository_id_key" ON "workflow_repositories"("workflow_id", "repository_id");

-- CreateIndex
CREATE INDEX "workflow_phases_organization_id_status_idx" ON "workflow_phases"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_phases_id_workflow_id_organization_id_key" ON "workflow_phases"("id", "workflow_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_phases_workflow_id_key_key" ON "workflow_phases"("workflow_id", "key");

-- CreateIndex
CREATE INDEX "workflow_work_items_organization_id_workflow_id_status_idx" ON "workflow_work_items"("organization_id", "workflow_id", "status");

-- CreateIndex
CREATE INDEX "workflow_work_items_organization_id_parent_id_idx" ON "workflow_work_items"("organization_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_work_items_id_workflow_id_organization_id_key" ON "workflow_work_items"("id", "workflow_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_work_items_workflow_id_key_key" ON "workflow_work_items"("workflow_id", "key");

-- CreateIndex
CREATE INDEX "workflow_dependencies_organization_id_workflow_id_idx" ON "workflow_dependencies"("organization_id", "workflow_id");

-- CreateIndex
CREATE INDEX "workflow_dependencies_organization_id_dependent_item_id_idx" ON "workflow_dependencies"("organization_id", "dependent_item_id");

-- CreateIndex
CREATE INDEX "workflow_dependencies_organization_id_depends_on_item_id_idx" ON "workflow_dependencies"("organization_id", "depends_on_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_dependencies_workflow_id_dependent_item_id_depends_key" ON "workflow_dependencies"("workflow_id", "dependent_item_id", "depends_on_item_id");

-- CreateIndex
CREATE INDEX "agent_executions_organization_id_workflow_id_status_idx" ON "agent_executions"("organization_id", "workflow_id", "status");

-- CreateIndex
CREATE INDEX "agent_executions_organization_id_phase_id_idx" ON "agent_executions"("organization_id", "phase_id");

-- CreateIndex
CREATE INDEX "agent_executions_organization_id_work_item_id_idx" ON "agent_executions"("organization_id", "work_item_id");

-- CreateIndex
CREATE INDEX "agent_executions_organization_id_parent_execution_id_idx" ON "agent_executions"("organization_id", "parent_execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_executions_id_workflow_id_organization_id_key" ON "agent_executions"("id", "workflow_id", "organization_id");

-- CreateIndex
CREATE INDEX "workflow_messages_organization_id_workflow_id_created_at_idx" ON "workflow_messages"("organization_id", "workflow_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_messages_organization_id_phase_id_created_at_idx" ON "workflow_messages"("organization_id", "phase_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_s3_key_key" ON "artifacts"("s3_key");

-- CreateIndex
CREATE INDEX "artifacts_organization_id_workflow_id_type_idx" ON "artifacts"("organization_id", "workflow_id", "type");

-- CreateIndex
CREATE INDEX "artifacts_organization_id_phase_id_idx" ON "artifacts"("organization_id", "phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_id_workflow_id_organization_id_key" ON "artifacts"("id", "workflow_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_workflow_id_key_version_key" ON "artifacts"("workflow_id", "key", "version");

-- CreateIndex
CREATE INDEX "workflow_approvals_organization_id_status_idx" ON "workflow_approvals"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_approvals_id_workflow_id_organization_id_key" ON "workflow_approvals"("id", "workflow_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_approvals_workflow_id_proposal_artifact_id_key" ON "workflow_approvals"("workflow_id", "proposal_artifact_id");

-- CreateIndex
CREATE INDEX "workflow_events_organization_id_workflow_id_created_at_idx" ON "workflow_events"("organization_id", "workflow_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_events_organization_id_event_type_idx" ON "workflow_events"("organization_id", "event_type");

-- CreateIndex
CREATE INDEX "integration_connections_organization_id_provider_status_idx" ON "integration_connections"("organization_id", "provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_id_organization_id_key" ON "integration_connections"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_organization_id_provider_external_t_key" ON "integration_connections"("organization_id", "provider", "external_tenant_id");

-- CreateIndex
CREATE INDEX "workflow_publishes_organization_id_workflow_id_status_idx" ON "workflow_publishes"("organization_id", "workflow_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_publishes_organization_id_idempotency_key_key" ON "workflow_publishes"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "external_issue_mappings_organization_id_workflow_id_idx" ON "external_issue_mappings"("organization_id", "workflow_id");

-- CreateIndex
CREATE INDEX "external_issue_mappings_organization_id_external_key_idx" ON "external_issue_mappings"("organization_id", "external_key");

-- CreateIndex
CREATE UNIQUE INDEX "external_issue_mappings_organization_id_provider_external_i_key" ON "external_issue_mappings"("organization_id", "provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_issue_mappings_work_item_id_connection_id_key" ON "external_issue_mappings"("work_item_id", "connection_id");
