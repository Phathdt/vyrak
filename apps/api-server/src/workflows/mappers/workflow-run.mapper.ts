import { WorkflowRun } from '@vyrak/workflow-core'

import { WorkflowRunResponseDto } from '../dto/workflow-run-response.dto'
import { WorkflowRunSummaryDto } from '../dto/workflow-run-summary.dto'

/**
 * Map WorkflowRun entity to WorkflowRunResponseDto
 */
export function toWorkflowRunResponseDto(run: WorkflowRun): WorkflowRunResponseDto {
  return {
    id: run.id,
    organizationId: run.organizationId,
    projectId: run.projectId,
    workflowKey: run.workflowKey,
    workflowVersion: run.workflowVersion,
    status: run.state,
    currentStepKey: run.currentStepKey,
    initiatedByUserId: run.initiatedByUserId,
    idempotencyKey: run.idempotencyKey,
    input: run.input,
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    cancelledAt: run.cancelledAt?.toISOString(),
    cancelledByUserId: run.cancelledByUserId,
    cancellationReason: run.cancellationReason,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }
}

/**
 * Map WorkflowRun entity to WorkflowRunSummaryDto
 * Truncates requirement to 100 characters
 */
export function toWorkflowRunSummaryDto(
  run: WorkflowRun,
  requirement: string
): WorkflowRunSummaryDto {
  const truncatedRequirement =
    requirement.length > 100 ? `${requirement.substring(0, 97)}...` : requirement

  return {
    id: run.id,
    projectId: run.projectId,
    workflowKey: run.workflowKey,
    status: run.state,
    requirement: truncatedRequirement,
    initiatedByUserId: run.initiatedByUserId,
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    createdAt: run.createdAt.toISOString(),
  }
}
