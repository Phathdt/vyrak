export declare const WorkflowType: {
  readonly HOTFIX: 'HOTFIX'
  readonly STORY: 'STORY'
  readonly EPIC: 'EPIC'
}
export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType]
export declare const WorkflowStatus: {
  readonly DRAFT: 'DRAFT'
  readonly BRAINSTORMING: 'BRAINSTORMING'
  readonly CLASSIFICATION_PENDING: 'CLASSIFICATION_PENDING'
  readonly ACTIVE: 'ACTIVE'
  readonly WAITING_APPROVAL: 'WAITING_APPROVAL'
  readonly COMPLETED: 'COMPLETED'
  readonly FAILED: 'FAILED'
  readonly CANCELLED: 'CANCELLED'
}
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
//# sourceMappingURL=workflow.entity.d.ts.map
