import { parseCodeReviewFindings, summarizeCodeReviewFindings } from './code-review-report.parser'

import type { CodeReviewResult } from '../../domain/interfaces/code-review.interface'
import type { OrchestrationStatus } from '../../domain/interfaces/orchestration-engine.interface'
import type { QAVerificationResult } from '../../domain/interfaces/qa-verification.interface'
import type { IWorkflowExecutionQueryService } from '../../domain/interfaces/workflow-execution-query.interface'
import type { IArtifactService } from '@vyrak/artifact'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { ISubTaskRepository } from '@vyrak/workflow-core'

/**
 * Read-only view of execution-phase state.
 * Plain TypeScript class - NO @Injectable() decorator
 */
export class WorkflowExecutionQueryService implements IWorkflowExecutionQueryService {
  constructor(
    private readonly subTaskRepository: ISubTaskRepository,
    private readonly artifactService: IArtifactService,
    private readonly logger: EnhancedLogger
  ) {}

  async getImplementationStatus(workflowId: string, phaseId: string): Promise<OrchestrationStatus> {
    const tasks = await this.subTaskRepository.findByPhaseId(phaseId)

    const counts = { completedTasks: 0, failedTasks: 0, inProgressTasks: 0, readyTasks: 0, pendingTasks: 0 }
    for (const task of tasks) {
      switch (task.status) {
        case 'COMPLETED':
          counts.completedTasks++
          break
        case 'FAILED':
          counts.failedTasks++
          break
        case 'IN_PROGRESS':
          counts.inProgressTasks++
          break
        case 'READY':
          counts.readyTasks++
          break
        case 'PENDING':
        case 'WAITING_DEPENDENCY':
        case 'BLOCKED':
          counts.pendingTasks++
          break
      }
    }

    return { workflowId, phaseId, totalTasks: tasks.length, ...counts, tasks }
  }

  async getCodeReviewReport(workflowId: string, phaseId: string): Promise<CodeReviewResult | null> {
    const artifacts = await this.artifactService.listPhaseArtifacts(phaseId)
    const reportArtifact = artifacts.find((a) => a.type === 'code-review-report' || a.key.includes('code-review'))
    if (!reportArtifact) {
      return null
    }

    const { content } = await this.artifactService.downloadArtifact(reportArtifact.id)
    const findings = parseCodeReviewFindings(content)

    return {
      workflowId,
      phaseId,
      reviewedFiles: [],
      findings,
      summary: summarizeCodeReviewFindings(findings),
      reportContent: content,
      artifactId: reportArtifact.id,
      completedAt: reportArtifact.createdAt,
    }
  }

  async getQAReport(workflowId: string, phaseId: string): Promise<QAVerificationResult | null> {
    try {
      const artifacts = await this.artifactService.listPhaseArtifacts(phaseId)
      const reportArtifact = artifacts.find((a) => a.type === 'qa-report' || a.key.includes('qa-report'))
      if (!reportArtifact) {
        return null
      }

      await this.artifactService.downloadArtifact(reportArtifact.id)

      // The stored markdown is not parsed back into criteria yet; the endpoint exposes the artifact reference.
      return {
        workflowId,
        phaseId,
        reportArtifactId: reportArtifact.id,
        criteriaResults: [],
        overallStatus: 'passed',
        executedAt: reportArtifact.createdAt,
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load QA report for workflow ${workflowId}, phase ${phaseId}: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }
}
