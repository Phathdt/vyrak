export declare const WorkflowEventActorType: {
  readonly SYSTEM: 'SYSTEM'
  readonly USER: 'USER'
  readonly AGENT: 'AGENT'
}
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
//# sourceMappingURL=workflow-event.entity.d.ts.map
