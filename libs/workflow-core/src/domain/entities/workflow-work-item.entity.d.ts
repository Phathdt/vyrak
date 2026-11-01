export declare const WorkflowWorkItemStatus: {
  readonly PROPOSED: 'PROPOSED'
  readonly APPROVED: 'APPROVED'
  readonly READY: 'READY'
  readonly IN_PROGRESS: 'IN_PROGRESS'
  readonly BLOCKED: 'BLOCKED'
  readonly DONE: 'DONE'
  readonly CANCELLED: 'CANCELLED'
}
export type WorkflowWorkItemStatus = (typeof WorkflowWorkItemStatus)[keyof typeof WorkflowWorkItemStatus]
export declare const WorkflowWorkItemType: {
  readonly EPIC: 'EPIC'
  readonly STORY: 'STORY'
  readonly TASK: 'TASK'
}
export type WorkflowWorkItemType = (typeof WorkflowWorkItemType)[keyof typeof WorkflowWorkItemType]
export interface WorkflowWorkItemEntity {
  id: string
  organizationId: string
  workflowId: string
  key: string
  type: string
  title: string
  description: string | null
  parentId: string | null
  acceptanceCriteria: Record<string, unknown> | null
  status: WorkflowWorkItemStatus
  priority: string | null
  estimate: Record<string, unknown> | null
  sequence: number
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}
//# sourceMappingURL=workflow-work-item.entity.d.ts.map
