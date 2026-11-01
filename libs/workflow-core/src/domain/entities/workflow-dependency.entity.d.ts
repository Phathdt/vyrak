export declare const WorkflowDependencyType: {
  readonly BLOCKS: 'BLOCKS'
}
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
//# sourceMappingURL=workflow-dependency.entity.d.ts.map
