import {
  NoImplementationArtifactsError,
  CodeReviewReportNotFoundError,
} from '../../domain/exceptions/code-review.exceptions'
import { CodeReviewAgentRunner, type CodeReviewContext } from '../../infras/agents/code-review-agent.runner'

import type {
  ICodeReviewService,
  CodeReviewResult,
  CodeReviewFinding,
} from '../../domain/interfaces/code-review.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IArtifactService } from '@vyrak/artifact'
import type { IConfigService } from '@vyrak/custom-config'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IWorkflowRepository, IWorkflowPhaseRepository } from '@vyrak/workflow-core'

/**
 * Code Review Service
 * Orchestrates automated code review with quality, security, and performance checks
 * Plain TypeScript class - NO @Injectable() decorator
 */
export class CodeReviewService implements ICodeReviewService {
  private readonly codeReviewRunner: CodeReviewAgentRunner

  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository,
    private readonly artifactService: IArtifactService,
    aiAgentService: IAIAgentService,
    private readonly configService: IConfigService,
    private readonly logger: EnhancedLogger
  ) {
    this.codeReviewRunner = new CodeReviewAgentRunner(aiAgentService)
  }

  async startCodeReview(workflowId: string, phaseId: string): Promise<CodeReviewResult> {
    this.logger.info(`Starting code review for workflow ${workflowId}, phase ${phaseId}`)

    try {
      // Load workflow
      const workflow = await this.workflowRepository.findById(workflowId)
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`)
      }

      // Load phase
      const phase = await this.workflowPhaseRepository.findById(phaseId)
      if (!phase) {
        throw new Error(`Phase not found: ${phaseId}`)
      }

      // Load Implementation artifacts to identify what was changed
      const implementationArtifacts = await this.loadImplementationArtifacts(workflowId)
      if (implementationArtifacts.length === 0) {
        throw new NoImplementationArtifactsError(workflowId, phaseId)
      }

      // Load context artifacts (PRD, Technical Specs, Implementation Plan)
      const contextArtifacts = await this.loadContextArtifacts(workflowId)

      // Prepare workspace path
      const workspacePath = this.getWorkspacePath(workflow, phase)

      // Build review context
      const reviewContext: CodeReviewContext = {
        workflow: {
          id: workflow.id,
          title: workflow.title,
          description: workflow.description,
        },
        phase: {
          id: phase.id,
          key: phase.key,
        },
        artifacts: {
          prd: contextArtifacts.prd,
          technicalSpecs: contextArtifacts.technicalSpecs,
          implementationPlan: contextArtifacts.implementationPlan,
          implementationReports: implementationArtifacts,
        },
        workspacePath,
      }

      // Execute code review agent
      const reviewResult = await this.codeReviewRunner.executeReview(reviewContext)

      // Parse findings from review result
      const findings = this.parseFindings(reviewResult.reportContent)

      // Calculate summary
      const summary = this.calculateSummary(findings)

      // Save Code Review Report as artifact
      const artifactId = await this.saveCodeReviewReport(workflowId, phaseId, reviewResult.reportContent, summary)

      const result: CodeReviewResult = {
        workflowId,
        phaseId,
        reviewedFiles: reviewResult.reviewedFiles,
        findings,
        summary,
        reportContent: reviewResult.reportContent,
        artifactId,
        completedAt: new Date(),
      }

      this.logger.log(
        `Code review completed: ${summary.totalFindings} findings (${summary.criticalCount} critical, ${summary.highCount} high)`
      )

      return result
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      this.logger.error(`Code review failed for workflow ${workflowId}`, err.message)
      throw _error
    }
  }

  async getReport(workflowId: string, phaseId: string): Promise<CodeReviewResult | null> {
    try {
      // Find code review report artifact
      const artifacts = await this.artifactService.listPhaseArtifacts(phaseId)
      const reportArtifact = artifacts.find((a) => a.type === 'code-review-report' || a.key.includes('code-review'))

      if (!reportArtifact) {
        throw new CodeReviewReportNotFoundError(workflowId, phaseId)
      }

      // Download artifact with content
      const artifactWithContent = await this.artifactService.downloadArtifact(reportArtifact.id)

      // Parse findings from report
      const findings = this.parseFindings(artifactWithContent.content)
      const summary = this.calculateSummary(findings)

      return {
        workflowId,
        phaseId,
        reviewedFiles: [],
        findings,
        summary,
        reportContent: artifactWithContent.content,
        artifactId: reportArtifact.id,
        completedAt: reportArtifact.createdAt,
      }
    } catch (_error) {
      if (_error instanceof CodeReviewReportNotFoundError) {
        return null
      }
      throw _error
    }
  }

  private async loadImplementationArtifacts(workflowId: string): Promise<string[]> {
    const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId)

    const implementationArtifacts = artifacts.filter(
      (a) => a.type === 'implementation-report' || a.key.includes('implementation-report')
    )

    const contents: string[] = []

    for (const artifact of implementationArtifacts) {
      try {
        const content = await this.artifactService.downloadArtifact(artifact.id)
        contents.push(content.content)
      } catch (_error) {
        this.logger.warn(`Failed to load implementation artifact: ${artifact.id}`)
      }
    }

    return contents
  }

  private async loadContextArtifacts(workflowId: string): Promise<{
    prd?: string
    technicalSpecs?: string
    implementationPlan?: string
  }> {
    const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId)

    const prdArtifact = artifacts.find((a) => a.type === 'prd' || a.key === 'prd')
    const techSpecsArtifact = artifacts.find((a) => a.type === 'ard' || a.type === 'adr' || a.key.includes('technical'))
    const planArtifact = artifacts.find((a) => a.type === 'implementation-plan' || a.key.includes('implementation'))

    const result: { prd?: string; technicalSpecs?: string; implementationPlan?: string } = {}

    if (prdArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(prdArtifact.id)
        result.prd = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load PRD artifact: ${prdArtifact.id}`)
      }
    }

    if (techSpecsArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(techSpecsArtifact.id)
        result.technicalSpecs = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load technical specs artifact: ${techSpecsArtifact.id}`)
      }
    }

    if (planArtifact) {
      try {
        const content = await this.artifactService.downloadArtifact(planArtifact.id)
        result.implementationPlan = content.content
      } catch (_error) {
        this.logger.warn(`Failed to load implementation plan artifact: ${planArtifact.id}`)
      }
    }

    return result
  }

  private getWorkspacePath(
    workflow: { organizationId: string; projectId: string; id: string },
    phase: { key: string }
  ): string {
    const workspacesPath = this.configService.workspace?.workspacesPath || '/tmp/vyrak-workspaces'
    return `${workspacesPath}/${workflow.organizationId}/${workflow.projectId}/${workflow.id}/${phase.key}`
  }

  private parseFindings(reportContent: string): CodeReviewFinding[] {
    const findings: CodeReviewFinding[] = []

    // Parse markdown-style findings from report
    // Expected format: ## Findings or ### {Severity} Issues
    const findingPattern = /###?\s+(CRITICAL|HIGH|MEDIUM|LOW|INFO)[:\s]+(.+?)(?=\n###?|\n##|$)/gis

    let match
    while ((match = findingPattern.exec(reportContent)) !== null) {
      const severity = match[1].toUpperCase() as CodeReviewFinding['severity']
      const content = match[2].trim()

      // Parse individual findings within the section
      const itemPattern = /[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?:\s+(.+?)(?:\n|$)/gi
      let itemMatch

      while ((itemMatch = itemPattern.exec(content)) !== null) {
        const file = itemMatch[1].trim()
        const message = itemMatch[2].trim()

        findings.push({
          file,
          severity,
          category: this.inferCategory(message),
          message,
        })
      }
    }

    // Fallback: parse simple bullet list if structured format not found
    if (findings.length === 0) {
      const bulletPattern = /[-*]\s+(?:\[(.+?)\])?\s*(.+?):\s+(.+?)(?:\n|$)/gi
      let bulletMatch

      while ((bulletMatch = bulletPattern.exec(reportContent)) !== null) {
        const severity = (bulletMatch[1]?.toUpperCase() || 'MEDIUM') as CodeReviewFinding['severity']
        const file = bulletMatch[2].trim()
        const message = bulletMatch[3].trim()

        findings.push({
          file,
          severity,
          category: this.inferCategory(message),
          message,
        })
      }
    }

    return findings
  }

  private inferCategory(message: string): CodeReviewFinding['category'] {
    const lowerMessage = message.toLowerCase()

    if (
      lowerMessage.includes('security') ||
      lowerMessage.includes('vulnerability') ||
      lowerMessage.includes('injection') ||
      lowerMessage.includes('authentication') ||
      lowerMessage.includes('authorization')
    ) {
      return 'security'
    }

    if (
      lowerMessage.includes('performance') ||
      lowerMessage.includes('slow') ||
      lowerMessage.includes('optimization') ||
      lowerMessage.includes('memory') ||
      lowerMessage.includes('cache')
    ) {
      return 'performance'
    }

    if (
      lowerMessage.includes('requirement') ||
      lowerMessage.includes('acceptance') ||
      lowerMessage.includes('spec') ||
      lowerMessage.includes('prd')
    ) {
      return 'requirements'
    }

    if (
      lowerMessage.includes('best practice') ||
      lowerMessage.includes('convention') ||
      lowerMessage.includes('style') ||
      lowerMessage.includes('pattern')
    ) {
      return 'best-practices'
    }

    return 'quality'
  }

  private calculateSummary(findings: CodeReviewFinding[]): CodeReviewResult['summary'] {
    return {
      totalFindings: findings.length,
      criticalCount: findings.filter((f) => f.severity === 'CRITICAL').length,
      highCount: findings.filter((f) => f.severity === 'HIGH').length,
      mediumCount: findings.filter((f) => f.severity === 'MEDIUM').length,
      lowCount: findings.filter((f) => f.severity === 'LOW').length,
      infoCount: findings.filter((f) => f.severity === 'INFO').length,
    }
  }

  private async saveCodeReviewReport(
    workflowId: string,
    phaseId: string,
    reportContent: string,
    summary: CodeReviewResult['summary']
  ): Promise<string> {
    try {
      const artifact = await this.artifactService.uploadArtifact(
        workflowId,
        'code-review-report',
        'code-review-report',
        'Code Review Report',
        reportContent,
        {
          phaseId,
          metadata: {
            totalFindings: summary.totalFindings,
            criticalCount: summary.criticalCount,
            highCount: summary.highCount,
            mediumCount: summary.mediumCount,
            lowCount: summary.lowCount,
            infoCount: summary.infoCount,
          },
        }
      )

      return artifact.id
    } catch (_error) {
      const err = _error instanceof Error ? _error : new Error(String(_error))
      this.logger.error(`Failed to save code review report for workflow ${workflowId}`, err.message)
      throw _error
    }
  }
}
