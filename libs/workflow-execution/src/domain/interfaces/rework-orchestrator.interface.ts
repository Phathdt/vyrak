/**
 * Rework Orchestrator Service Interface
 * Domain contract for intelligent rework handling with finding prioritization
 */

export interface PrioritizedFinding {
  id: string
  file: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'QA_FAILURE'
  category: string
  message: string
  suggestion?: string
  status: 'OPEN' | 'FIXED' | 'WONT_FIX'
  source: 'CODE_REVIEW' | 'QA'
}

export interface ReworkIteration {
  iterationNumber: number
  startedAt: Date
  completedAt?: Date
  findingsAddressed: string[] // finding IDs
  newFindingsIntroduced: number
  status: 'in_progress' | 'completed' | 'failed'
  reportArtifactId?: string
}

export interface ReworkResult {
  workflowId: string
  phaseId: string
  iterations: ReworkIteration[]
  totalFindingsFixed: number
  remainingFindings: number
  converged: boolean
  convergenceReason: string
  completedAt: Date
}

export interface ReworkStatus {
  workflowId: string
  phaseId: string
  currentIteration: number
  maxIterations: number
  findingsFixed: number
  findingsRemaining: number
  isConverged: boolean
  canContinue: boolean
}

export interface IReworkOrchestratorService {
  /**
   * Start rework process after code review/QA
   * Prioritizes findings and orchestrates fix iterations
   */
  startRework(workflowId: string, phaseId: string): Promise<ReworkResult>

  /**
   * Get current rework status
   */
  getReworkStatus(workflowId: string, phaseId: string): Promise<ReworkStatus | null>

  /**
   * Load and prioritize findings from code review and QA
   */
  loadAndPrioritizeFindings(workflowId: string, phaseId: string): Promise<PrioritizedFinding[]>
}
