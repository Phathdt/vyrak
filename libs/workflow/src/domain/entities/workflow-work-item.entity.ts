export const WorkflowWorkItemStatus = {
  PROPOSED: 'PROPOSED',
  APPROVED: 'APPROVED',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const

export type WorkflowWorkItemStatus = (typeof WorkflowWorkItemStatus)[keyof typeof WorkflowWorkItemStatus]

export const WorkflowWorkItemType = {
  EPIC: 'EPIC',
  STORY: 'STORY',
  TASK: 'TASK',
} as const

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
