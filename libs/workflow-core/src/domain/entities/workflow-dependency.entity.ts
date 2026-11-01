export const WorkflowDependencyType = {
  BLOCKS: 'BLOCKS',
} as const

export type WorkflowDependencyType = (typeof WorkflowDependencyType)[keyof typeof WorkflowDependencyType]

export interface WorkflowDependencyEntity {
  id: string
  organizationId: string
  workflowId: string
  dependentItemId: string
  dependsOnItemId: string
  type: WorkflowDependencyType
  createdAt: Date
}
