import type {
  TechnicalRefinementChatRequestDto,
  TechnicalRefinementChatResponseDto,
  TechnicalRefinementSessionResponseDto,
  GenerateArtifactsResponseDto,
  GenerateSubTasksResponseDto,
} from '../schemas/technical-refinement.schemas'

export type TechnicalRefinementChatInput = {
  workflowId: string
  organizationId: string
  projectId: string
  userMessage: string
  codeSnippets?: TechnicalRefinementChatRequestDto['codeSnippets']
}

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
   * Chat with Technical Refinement Agent with repository scouting enabled
   */
  chatTechnicalRefinement(input: TechnicalRefinementChatInput): Promise<TechnicalRefinementChatResponseDto>

  /**
   * Generate technical artifacts (ADR, ARD, Implementation Plan) from conversation
   */
  generateTechnicalArtifacts(workflowId: string, sessionId: string): Promise<GenerateArtifactsResponseDto>

  /**
   * Generate sub-tasks from Implementation Plan artifact
   */
  generateSubTasks(workflowId: string, sessionId: string): Promise<GenerateSubTasksResponseDto>
}
