import type {
  PlanningChatRequestDto,
  PlanningChatResponseDto,
  PlanningSessionResponseDto,
} from '../schemas/workflow-planning.schemas'
export type PlanningChatInput = {
  workflowId: string
  organizationId: string
  projectId: string
  userMessage: string
  codeSnippets?: PlanningChatRequestDto['codeSnippets']
  repoPaths?: string[]
}
export interface IWorkflowPlanningService {
  getPlanningSession(workflowId: string, organizationId: string, projectId: string): Promise<PlanningSessionResponseDto>
  chat(input: PlanningChatInput): Promise<PlanningChatResponseDto>
}
//# sourceMappingURL=workflow-planning-service.interface.d.ts.map
