export const WorkflowPublishStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  PARTIAL: 'PARTIAL',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const

export type WorkflowPublishStatus = (typeof WorkflowPublishStatus)[keyof typeof WorkflowPublishStatus]

export interface WorkflowPublishEntity {
  id: string
  organizationId: string
  workflowId: string
  connectionId: string
  approvalId: string
  status: WorkflowPublishStatus
  idempotencyKey: string
  attempts: number
  lastError: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
