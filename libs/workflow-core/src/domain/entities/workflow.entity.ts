export const WorkflowType = {
  HOTFIX: 'HOTFIX',
  STORY: 'STORY',
  EPIC: 'EPIC',
} as const

export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType]

export const WorkflowStatus = {
  DRAFT: 'DRAFT',
  BRAINSTORMING: 'BRAINSTORMING',
  CLASSIFICATION_PENDING: 'CLASSIFICATION_PENDING',
  ACTIVE: 'ACTIVE',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const

export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus]

export interface WorkflowEntity {
  id: string
  organizationId: string
  projectId: string
  type: WorkflowType | null
  status: WorkflowStatus
  title: string
  description: string | null
  currentPhaseKey: string | null
  definitionSnapshot: Record<string, unknown> | null
  classification: Record<string, unknown> | null
  classificationConfirmedAt: Date | null
  classificationConfirmedById: string | null
  createdById: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
