export declare const WorkflowPhaseStatus: {
  readonly PENDING: 'PENDING'
  readonly IN_PROGRESS: 'IN_PROGRESS'
  readonly WAITING_APPROVAL: 'WAITING_APPROVAL'
  readonly COMPLETED: 'COMPLETED'
  readonly FAILED: 'FAILED'
  readonly SKIPPED: 'SKIPPED'
}
export type WorkflowPhaseStatus = (typeof WorkflowPhaseStatus)[keyof typeof WorkflowPhaseStatus]
export interface WorkflowPhaseEntity {
  id: string
  organizationId: string
  workflowId: string
  key: string
  name: string
  sequence: number
  status: WorkflowPhaseStatus
  config: Record<string, unknown> | null
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: Record<string, unknown> | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
//# sourceMappingURL=workflow-phase.entity.d.ts.map
