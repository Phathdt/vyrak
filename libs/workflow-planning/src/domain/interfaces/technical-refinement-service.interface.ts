import type {
  TechnicalRefinementSessionResponseDto,
  GenerateArtifactsResponseDto,
  GenerateSubTasksResponseDto,
  SubTasksListResponseDto,
} from '../schemas/technical-refinement.schemas'

export interface ITechnicalRefinementService {
  /**
   * Get or create Technical Refinement session with history
   */
  getTechnicalRefinementSession(
    workflowId: string,
    organizationId: string,
    projectId: string
  ): Promise<TechnicalRefinementSessionResponseDto>

  /**
   * Generate technical artifacts (ADR, ARD, Implementation Plan) from conversation
   */
  generateTechnicalArtifacts(workflowId: string, sessionId: string): Promise<GenerateArtifactsResponseDto>

  /**
   * Generate sub-tasks from Implementation Plan artifact
   */
  generateSubTasks(workflowId: string, sessionId: string): Promise<GenerateSubTasksResponseDto>

  /**
   * List sub-tasks generated for the workflow's Technical Refinement phase
   */
  listSubTasks(workflowId: string): Promise<SubTasksListResponseDto>
}
