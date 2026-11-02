import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { PRDNotFoundError, QAExecutionError } from '../../domain/exceptions/qa-verification.exceptions'
import { QAAgentRunner, type QAContext } from '../../infras/agents/qa-agent.runner'

import type { IQAVerificationService, QAVerificationResult } from '../../domain/interfaces/qa-verification.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IArtifactService } from '@vyrak/artifact'
import type { IConfigService } from '@vyrak/custom-config'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IWorkflowRepository } from '@vyrak/workflow-core'

/**
 * QA Verification Service
 * Verifies implementation against PRD acceptance criteria
 * Plain TypeScript class - NO @Injectable() decorator
 */
export class QAVerificationService implements IQAVerificationService {
  private readonly qaRunner: QAAgentRunner
  private qaReportsCache: Map<string, QAVerificationResult> = new Map()

  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly artifactService: IArtifactService,
    aiAgentService: IAIAgentService,
    private readonly configService: IConfigService,
    private readonly logger: EnhancedLogger
  ) {
    this.qaRunner = new QAAgentRunner(aiAgentService)
  }

  async startQA(workflowId: string, phaseId: string): Promise<QAVerificationResult> {
    this.logger.info(`Starting QA verification for workflow ${workflowId}, phase ${phaseId}`)

    try {
      // Load workflow
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        throw new QAExecutionError(workflowId, `Workflow not found: ${workflowId}`)
      }

      // Load PRD artifact (required for acceptance criteria)
      const prdContent = await this.loadPRDArtifact(workflowId)
      if (!prdContent) {
        throw new PRDNotFoundError(workflowId, phaseId)
      }

      // Load other context artifacts
      const contextArtifacts = await this.loadContextArtifacts(workflowId)

      // Prepare workspace path
      const workspacePath = await this.prepareWorkspace(workflow, phaseId)

      // Build QA context
      const qaContext: QAContext = {
        workflow: {
          id: workflow.id,
          title: workflow.title,
          description: workflow.description,
        },
        phase: {
          id: phaseId,
          key: 'qa',
        },
        artifacts: {
          prd: prdContent,
          technicalSpecs: contextArtifacts.technicalSpecs,
          implementationPlan: contextArtifacts.implementationPlan,
        },
        workspacePath,
      }

      // Execute QA verification
      const result = await this.qaRunner.executeQA(qaContext)

      // Save QA report as artifact
      await this.saveQAReport(workflow.id, phaseId, result)

      // Cache result
      const cacheKey = `${workflowId}:${phaseId}`
      this.qaReportsCache.set(cacheKey, result)

      this.logger.log(
        `QA verification completed for workflow ${workflowId}: ${result.overallStatus} (${result.criteriaResults.length} criteria)`
      )

      return result
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      this.logger.error(`QA verification failed for workflow ${workflowId}`, err.message)

      if (_error instanceof PRDNotFoundError || _error instanceof QAExecutionError) {
        throw _error
      }

      throw new QAExecutionError(workflowId, `QA verification failed: ${err.message}`, err)
    }
  }

  async getQAReport(workflowId: string, phaseId: string): Promise<QAVerificationResult | null> {
    // Check cache first
    const cacheKey = `${workflowId}:${phaseId}`
    const cachedResult = this.qaReportsCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    // Try to load from artifacts
    try {
      const artifacts = await this.artifactService.listPhaseArtifacts(phaseId)
      const qaReportArtifact = artifacts.find((a) => a.type === 'qa-report' || a.key.includes('qa-report'))

      if (!qaReportArtifact) {
        return null
      }

      await this.artifactService.downloadArtifact(qaReportArtifact.id)

      // Parse the report content back to result format
      // For now, return a placeholder - in production, you'd parse the markdown
      const result: QAVerificationResult = {
        workflowId,
        phaseId,
        reportArtifactId: qaReportArtifact.id,
        criteriaResults: [],
        overallStatus: 'passed', // Would be parsed from artifact
        executedAt: qaReportArtifact.createdAt,
      }

      this.qaReportsCache.set(cacheKey, result)
      return result
    } catch (_error) {
      this.logger.warn(`Failed to load QA report for workflow ${workflowId}, phase ${phaseId}`)
      return null
    }
  }

  private async loadPRDArtifact(workflowId: string): Promise<string | null> {
    try {
      const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId)
      const prdArtifact = artifacts.find((a) => a.type === 'prd' || a.key === 'prd')

      if (!prdArtifact) {
        return null
      }

      const artifactWithContent = await this.artifactService.downloadArtifact(prdArtifact.id)
      return artifactWithContent.content
    } catch (_error) {
      this.logger.warn(`Failed to load PRD artifact for workflow ${workflowId}`)
      return null
    }
  }

  private async loadContextArtifacts(workflowId: string): Promise<{
    technicalSpecs?: string
    implementationPlan?: string
  }> {
    const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId)

    const techSpecsArtifact = artifacts.find((a) => a.type === 'ard' || a.type === 'adr' || a.key.includes('technical'))
    const implementationPlanArtifact = artifacts.find(
      (a) => a.type === 'implementation-plan' || a.key.includes('implementation')
    )

    const result: { technicalSpecs?: string; implementationPlan?: string } = {}

    if (techSpecsArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(techSpecsArtifact.id)
        result.technicalSpecs = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load technical specs artifact: ${techSpecsArtifact.id}`)
      }
    }

    if (implementationPlanArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(implementationPlanArtifact.id)
        result.implementationPlan = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load implementation plan artifact: ${implementationPlanArtifact.id}`)
      }
    }

    return result
  }

  private async prepareWorkspace(
    workflow: { id: string; organizationId: string; projectId?: string },
    _phaseId: string
  ): Promise<string> {
    try {
      // Use standard workspaces path (not worktree for QA - read-only access is fine)
      const workspacesPath = this.configService.workspace?.workspacesPath || '/tmp/vyrak-workspaces'
      const workspacePath = path.join(
        workspacesPath,
        workflow.organizationId,
        workflow.projectId || 'default',
        workflow.id,
        'qa'
      )

      // Ensure directory exists
      await mkdir(workspacePath, { recursive: true })

      return workspacePath
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      throw new QAExecutionError(workflow.id, `Failed to prepare workspace for QA: ${err.message}`, err)
    }
  }

  private async saveQAReport(workflowId: string, phaseId: string, result: QAVerificationResult): Promise<void> {
    try {
      // Build markdown report
      const reportContent = this.buildReportMarkdown(result)

      // Upload as artifact
      const artifact = await this.artifactService.uploadArtifact(
        workflowId,
        'qa-report',
        'qa-report',
        'QA Verification Report',
        reportContent,
        {
          phaseId,
          metadata: {
            overallStatus: result.overallStatus,
            totalCriteria: result.criteriaResults.length,
            passedCriteria: result.criteriaResults.filter((c) => c.status === 'pass').length,
            failedCriteria: result.criteriaResults.filter((c) => c.status === 'fail').length,
            skippedCriteria: result.criteriaResults.filter((c) => c.status === 'skipped').length,
            executedAt: result.executedAt.toISOString(),
          },
        }
      )

      // Update result with artifact ID
      result.reportArtifactId = artifact.id
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      this.logger.error(`Failed to save QA report for workflow ${workflowId}`, err.message)
    }
  }

  private buildReportMarkdown(result: QAVerificationResult): string {
    const lines: string[] = []

    lines.push('# QA Verification Report')
    lines.push('')
    lines.push(`**Executed:** ${result.executedAt.toISOString()}`)
    lines.push(`**Overall Status:** ${result.overallStatus.toUpperCase()}`)
    lines.push('')

    // Summary statistics
    const passedCount = result.criteriaResults.filter((c) => c.status === 'pass').length
    const failedCount = result.criteriaResults.filter((c) => c.status === 'fail').length
    const skippedCount = result.criteriaResults.filter((c) => c.status === 'skipped').length

    lines.push('## Summary')
    lines.push('')
    lines.push(`- **Total Criteria:** ${result.criteriaResults.length}`)
    lines.push(`- **Passed:** ${passedCount}`)
    lines.push(`- **Failed:** ${failedCount}`)
    lines.push(`- **Skipped:** ${skippedCount}`)
    lines.push('')

    // Criteria results
    lines.push('## Acceptance Criteria Results')
    lines.push('')

    result.criteriaResults.forEach((criterion, index) => {
      lines.push(`### ${index + 1}. ${criterion.criterion}`)
      lines.push('')
      lines.push(`**Status:** ${criterion.status.toUpperCase()}`)
      lines.push('')

      if (criterion.details) {
        lines.push(`**Details:** ${criterion.details}`)
        lines.push('')
      }

      if (criterion.errorMessage) {
        lines.push(`**Error:** ${criterion.errorMessage}`)
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    })

    // Usage statistics
    if (result.usage) {
      lines.push('## Execution Statistics')
      lines.push('')
      lines.push(`- **Input Tokens:** ${result.usage.inputTokens}`)
      lines.push(`- **Output Tokens:** ${result.usage.outputTokens}`)
      lines.push('')
    }

    return lines.join('\n')
  }
}
