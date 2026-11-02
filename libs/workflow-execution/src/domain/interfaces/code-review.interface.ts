/**
 * Code Review Service Interface
 * Domain contract for code review orchestration
 */

export interface CodeReviewFinding {
  file: string
  line?: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  category: 'quality' | 'security' | 'performance' | 'requirements' | 'best-practices'
  message: string
  suggestion?: string
}

export interface CodeReviewResult {
  workflowId: string
  phaseId: string
  reviewedFiles: string[]
  findings: CodeReviewFinding[]
  summary: {
    totalFindings: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    infoCount: number
  }
  reportContent: string
  artifactId?: string
  completedAt: Date
}

export interface ICodeReviewService {
  /**
   * Start code review phase execution
   * Identifies changed files from Implementation phase and runs code review
   */
  startCodeReview(workflowId: string, phaseId: string): Promise<CodeReviewResult>

  /**
   * Get code review report for a workflow
   */
  getReport(workflowId: string, phaseId: string): Promise<CodeReviewResult | null>
}
