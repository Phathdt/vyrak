import type { PlanningSessionResponseDto } from '../schemas/workflow-planning.schemas'
import type { ArtifactEntity } from '@vyrak/artifact'

export interface IWorkflowPlanningService {
  getPlanningSession(workflowId: string, organizationId: string, projectId: string): Promise<PlanningSessionResponseDto>
  generatePRDArtifact(workflowId: string, sessionId: string, phaseId: string): Promise<ArtifactEntity>
  generatePRDArtifactFromMessage(workflowId: string, messageId: string, phaseId: string): Promise<ArtifactEntity>
}
