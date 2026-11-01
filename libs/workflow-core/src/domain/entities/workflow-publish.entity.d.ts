export declare const WorkflowPublishStatus: {
  readonly PENDING: 'PENDING'
  readonly RUNNING: 'RUNNING'
  readonly PARTIAL: 'PARTIAL'
  readonly SUCCEEDED: 'SUCCEEDED'
  readonly FAILED: 'FAILED'
}
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
//# sourceMappingURL=workflow-publish.entity.d.ts.map
