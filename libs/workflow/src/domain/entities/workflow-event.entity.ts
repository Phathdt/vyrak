export const WorkflowEventActorType = {
  SYSTEM: 'SYSTEM',
  USER: 'USER',
  AGENT: 'AGENT',
} as const

export type WorkflowEventActorType = (typeof WorkflowEventActorType)[keyof typeof WorkflowEventActorType]

export interface WorkflowEventEntity {
  id: string
  organizationId: string
  workflowId: string
  phaseId: string | null
  eventType: string
  actorType: WorkflowEventActorType | null
  actorId: string | null
  payload: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}
