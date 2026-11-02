import type {
  PlanningChatRequestDto,
  PlanningChatResponseDto,
  PlanningSessionResponseDto,
} from '../schemas/workflow-planning.schemas'
import type { ArtifactEntity } from '@vyrak/artifact'

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
  generatePRDArtifact(workflowId: string, sessionId: string, phaseId: string): Promise<ArtifactEntity>
  generatePRDArtifactFromMessage(workflowId: string, messageId: string, phaseId: string): Promise<ArtifactEntity>
}
