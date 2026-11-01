export declare const WorkflowMessageRole: {
  readonly USER: 'USER'
  readonly ASSISTANT: 'ASSISTANT'
  readonly SYSTEM: 'SYSTEM'
  readonly TOOL: 'TOOL'
}
export type WorkflowMessageRole = (typeof WorkflowMessageRole)[keyof typeof WorkflowMessageRole]
export interface WorkflowMessageEntity {
  id: string
  organizationId: string
  workflowId: string
  phaseId: string | null
  agentExecutionId: string | null
  role: WorkflowMessageRole
  content: string
  metadata: Record<string, unknown> | null
  createdById: string | null
  createdAt: Date
}
//# sourceMappingURL=workflow-message.entity.d.ts.map
