import { randomUUID } from 'crypto'

import { z } from 'zod'

/**
 * Workflow approval status enum
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Schema for WorkflowApproval validation
 */
export const WorkflowApprovalSchema = z.object({
  id: z.string().uuid(),
  workflowRunId: z.string().uuid(),
  status: z.nativeEnum(ApprovalStatus),
  planArtifactId: z.string().uuid(),
  planArtifactHash: z.string().min(1),
  decidedByUserId: z.string().uuid().optional(),
  decidedAt: z.date().optional(),
  comment: z.string().optional(),
  invalidatedAt: z.date().optional(),
  invalidationReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type WorkflowApproval = z.infer<typeof WorkflowApprovalSchema>

/**
 * Properties for creating a workflow approval
 */
export interface CreateApprovalProps {
  workflowRunId: string
  planArtifactId: string
  planArtifactHash: string
}

/**
 * Create a new workflow approval with default values
 */
export function createWorkflowApproval(props: CreateApprovalProps): WorkflowApproval {
  const now = new Date()
  const approval: WorkflowApproval = {
    id: randomUUID(),
    workflowRunId: props.workflowRunId,
    status: ApprovalStatus.PENDING,
    planArtifactId: props.planArtifactId,
    planArtifactHash: props.planArtifactHash,
    createdAt: now,
    updatedAt: now,
  }

  const parsed = WorkflowApprovalSchema.safeParse(approval)
  if (!parsed.success) {
    throw new Error(`Invalid workflow approval: ${parsed.error.message}`)
  }

  return approval
}

/**
 * Check if approval is pending and not invalidated
 */
export function isPending(approval: WorkflowApproval): boolean {
  return approval.status === ApprovalStatus.PENDING && !approval.invalidatedAt
}

/**
 * Check if approval has been decided (approved or rejected)
 */
export function isDecided(approval: WorkflowApproval): boolean {
  return approval.status === ApprovalStatus.APPROVED || approval.status === ApprovalStatus.REJECTED
}

/**
 * Approve the workflow
 * @returns New approval object (immutable)
 */
export function approve(approval: WorkflowApproval, userId: string, comment?: string): WorkflowApproval {
  return {
    ...approval,
    status: ApprovalStatus.APPROVED,
    decidedByUserId: userId,
    decidedAt: new Date(),
    comment,
    updatedAt: new Date(),
  }
}

/**
 * Reject the workflow
 * @returns New approval object (immutable)
 */
export function reject(approval: WorkflowApproval, userId: string, comment?: string): WorkflowApproval {
  return {
    ...approval,
    status: ApprovalStatus.REJECTED,
    decidedByUserId: userId,
    decidedAt: new Date(),
    comment,
    updatedAt: new Date(),
  }
}

/**
 * Invalidate the approval (e.g., plan changed)
 * @returns New approval object (immutable)
 */
export function invalidate(approval: WorkflowApproval, reason: string): WorkflowApproval {
  return {
    ...approval,
    invalidatedAt: new Date(),
    invalidationReason: reason,
    updatedAt: new Date(),
  }
}
