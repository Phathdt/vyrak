import type { CodeReviewResult } from './code-review.interface'
import type { OrchestrationStatus } from './orchestration-engine.interface'
import type { QAVerificationResult } from './qa-verification.interface'

/**
 * Read-only access to execution-phase state (sub-tasks, code review report, QA report).
 * Runs no AI agent, so it is safe to use from processes that must not carry the agent runtime.
 */
export interface IWorkflowExecutionQueryService {
  getImplementationStatus(workflowId: string, phaseId: string): Promise<OrchestrationStatus>

  getCodeReviewReport(workflowId: string, phaseId: string): Promise<CodeReviewResult | null>

  getQAReport(workflowId: string, phaseId: string): Promise<QAVerificationResult | null>
}
