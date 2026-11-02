export interface QAVerificationResult {
  workflowId: string
  phaseId: string
  reportArtifactId?: string
  criteriaResults: CriterionResult[]
  overallStatus: 'passed' | 'failed' | 'partial'
  executedAt: Date
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface CriterionResult {
  criterion: string
  status: 'pass' | 'fail' | 'skipped'
  details?: string
  errorMessage?: string
}

export interface IQAVerificationService {
  /**
   * Start QA verification against acceptance criteria
   * Loads PRD artifact and verifies each acceptance criterion
   */
  startQA(workflowId: string, phaseId: string): Promise<QAVerificationResult>

  /**
   * Get QA report for a workflow phase
   */
  getQAReport(workflowId: string, phaseId: string): Promise<QAVerificationResult | null>
}
