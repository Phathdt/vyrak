export const WorkflowMessageRole = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  SYSTEM: 'SYSTEM',
  TOOL: 'TOOL',
} as const

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
