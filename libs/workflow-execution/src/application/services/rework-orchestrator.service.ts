import { v4 as uuidv4 } from 'uuid'

import { NoFindingsToFixError } from '../../domain/exceptions/rework.exceptions'
import { ReworkAgentRunner, type ReworkContext } from '../../infras/agents/rework-agent.runner'

import type { ICodeReviewService } from '../../domain/interfaces/code-review.interface'
import type { IQAVerificationService } from '../../domain/interfaces/qa-verification.interface'
import type {
  IReworkOrchestratorService,
  PrioritizedFinding,
  ReworkIteration,
  ReworkResult,
  ReworkStatus,
} from '../../domain/interfaces/rework-orchestrator.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IArtifactService } from '@vyrak/artifact'
import type { IConfigService } from '@vyrak/custom-config'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IWorkflowRepository, IWorkflowPhaseRepository } from '@vyrak/workflow-core'

/**
 * Rework Orchestrator Service
 * Intelligently prioritizes and fixes findings from code review and QA
 * Includes convergence checking to prevent infinite loops
 * Plain TypeScript class - NO @Injectable() decorator
 */
export class ReworkOrchestratorService implements IReworkOrchestratorService {
  private readonly reworkRunner: ReworkAgentRunner
  private readonly maxIterations: number = 3
  private readonly findingsMap: Map<string, Map<string, PrioritizedFinding>> = new Map() // workflowId -> findingId -> finding

  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository,
    private readonly codeReviewService: ICodeReviewService,
    private readonly qaVerificationService: IQAVerificationService,
    private readonly artifactService: IArtifactService,
    aiAgentService: IAIAgentService,
    private readonly configService: IConfigService,
    private readonly logger: EnhancedLogger
  ) {
    this.reworkRunner = new ReworkAgentRunner(aiAgentService)
  }

  async startRework(workflowId: string, phaseId: string): Promise<ReworkResult> {
    this.logger.info(`Starting rework for workflow ${workflowId}, phase ${phaseId}`)

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

      // Load and prioritize findings
      const findings = await this.loadAndPrioritizeFindings(workflowId, phaseId)
      if (findings.length === 0) {
        throw new NoFindingsToFixError(workflowId, phaseId)
      }

      this.logger.log(
        `Found ${findings.length} findings: ${findings.filter((f) => f.severity === 'CRITICAL').length} CRITICAL, ` +
          `${findings.filter((f) => f.severity === 'HIGH').length} HIGH, ` +
          `${findings.filter((f) => f.severity === 'QA_FAILURE').length} QA failures`
      )

      const iterations: ReworkIteration[] = []
      let converged = false
      let convergenceReason = ''

      // Iterative rework loop
      for (let i = 1; i <= this.maxIterations; i++) {
        this.logger.info(`Starting rework iteration ${i}/${this.maxIterations}`)

        const iteration = await this.executeReworkIteration(workflow, phase, findings, i)
        iterations.push(iteration)

        // Check convergence after iteration
        const convergenceCheck = await this.checkConvergence(workflowId, phaseId, findings, i)

        if (convergenceCheck.converged) {
          converged = true
          convergenceReason = convergenceCheck.reason
          this.logger.log(`Rework converged: ${convergenceReason}`)
          break
        }

        // If not converged and not last iteration, reload findings
        if (i < this.maxIterations) {
          const newFindings = await this.loadAndPrioritizeFindings(workflowId, phaseId)
          // Update findings for next iteration
          findings.length = 0
          findings.push(...newFindings)
        }
      }

      // If max iterations reached without convergence
      if (!converged) {
        convergenceReason = `Max iterations (${this.maxIterations}) reached without full convergence`
        this.logger.warn(convergenceReason)
      }

      const totalFixed = iterations.reduce((sum, iter) => sum + iter.findingsAddressed.length, 0)
      const remainingFindings = findings.filter((f) => f.status === 'OPEN').length

      const result: ReworkResult = {
        workflowId,
        phaseId,
        iterations,
        totalFindingsFixed: totalFixed,
        remainingFindings,
        converged,
        convergenceReason,
        completedAt: new Date(),
      }

      this.logger.log(
        `Rework completed: ${totalFixed} findings fixed, ${remainingFindings} remaining, converged: ${converged}`
      )

      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error(`Rework failed for workflow ${workflowId}`, err.message)
      throw error
    }
  }

  async getReworkStatus(workflowId: string, phaseId: string): Promise<ReworkStatus | null> {
    try {
      const findings = await this.loadAndPrioritizeFindings(workflowId, phaseId)

      if (findings.length === 0) {
        return null
      }

      const fixedCount = findings.filter((f) => f.status === 'FIXED').length
      const remainingCount = findings.filter((f) => f.status === 'OPEN').length

      // Check if converged (all critical/high fixed)
      const criticalOrHighRemaining = findings.filter(
        (f) => f.status === 'OPEN' && (f.severity === 'CRITICAL' || f.severity === 'HIGH')
      ).length

      const isConverged = criticalOrHighRemaining === 0

      return {
        workflowId,
        phaseId,
        currentIteration: 0, // Would need to track this in database
        maxIterations: this.maxIterations,
        findingsFixed: fixedCount,
        findingsRemaining: remainingCount,
        isConverged,
        canContinue: !isConverged && remainingCount > 0,
      }
    } catch (_error) {
      this.logger.warn(`Failed to get rework status for workflow ${workflowId}`)
      return null
    }
  }

  async loadAndPrioritizeFindings(workflowId: string, phaseId: string): Promise<PrioritizedFinding[]> {
    const findings: PrioritizedFinding[] = []

    // Load Code Review findings
    try {
      const codeReviewReport = await this.codeReviewService.getReport(workflowId, phaseId)
      if (codeReviewReport) {
        for (const finding of codeReviewReport.findings) {
          findings.push({
            id: uuidv4(),
            file: finding.file,
            severity: finding.severity,
            category: finding.category,
            message: finding.message,
            suggestion: finding.suggestion,
            status: 'OPEN',
            source: 'CODE_REVIEW',
          })
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load code review findings: ${error}`)
    }

    // Load QA failures
    try {
      const qaReport = await this.qaVerificationService.getQAReport(workflowId, phaseId)
      if (qaReport) {
        for (const criterion of qaReport.criteriaResults) {
          if (criterion.status === 'fail') {
            findings.push({
              id: uuidv4(),
              file: 'acceptance-criteria',
              severity: 'QA_FAILURE',
              category: 'requirements',
              message: `Failed: ${criterion.criterion}`,
              suggestion: criterion.errorMessage,
              status: 'OPEN',
              source: 'QA',
            })
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load QA findings: ${error}`)
    }

    // Prioritize: CRITICAL > HIGH > QA_FAILURE > MEDIUM > LOW > INFO
    const priorityOrder = {
      CRITICAL: 1,
      HIGH: 2,
      QA_FAILURE: 3,
      MEDIUM: 4,
      LOW: 5,
      INFO: 6,
    }

    findings.sort((a, b) => {
      const priorityA = priorityOrder[a.severity] || 999
      const priorityB = priorityOrder[b.severity] || 999
      return priorityA - priorityB
    })

    // Store in cache
    const findingsMap = new Map<string, PrioritizedFinding>()
    for (const finding of findings) {
      findingsMap.set(finding.id, finding)
    }
    this.findingsMap.set(workflowId, findingsMap)

    return findings
  }

  private async executeReworkIteration(
    workflow: { id: string; organizationId: string; projectId?: string; title: string },
    phase: { id: string; key: string },
    findings: PrioritizedFinding[],
    iterationNumber: number
  ): Promise<ReworkIteration> {
    const iteration: ReworkIteration = {
      iterationNumber,
      startedAt: new Date(),
      findingsAddressed: [],
      newFindingsIntroduced: 0,
      status: 'in_progress',
    }

    try {
      // Filter findings to address (OPEN and high priority)
      const findingsToFix = findings.filter(
        (f) =>
          f.status === 'OPEN' && (f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.severity === 'QA_FAILURE')
      )

      if (findingsToFix.length === 0) {
        this.logger.info('No high-priority findings to fix in this iteration')
        iteration.status = 'completed'
        iteration.completedAt = new Date()
        return iteration
      }

      // Group findings by file for batch fixes
      const findingsByFile = this.groupFindingsByFile(findingsToFix)

      // Load context artifacts
      const contextArtifacts = await this.loadContextArtifacts(workflow.id)

      // Prepare workspace
      const workspacePath = this.getWorkspacePath(workflow, phase)

      // Execute rework for each file
      for (const [file, fileFindings] of Object.entries(findingsByFile)) {
        this.logger.info(`Fixing ${fileFindings.length} findings in ${file}`)

        const reworkContext: ReworkContext = {
          workflow: {
            id: workflow.id,
            title: workflow.title,
          },
          phase: {
            id: phase.id,
            key: phase.key,
          },
          iterationNumber,
          file,
          findings: fileFindings,
          artifacts: {
            prd: contextArtifacts.prd,
            technicalSpecs: contextArtifacts.technicalSpecs,
            implementationPlan: contextArtifacts.implementationPlan,
          },
          workspacePath,
        }

        try {
          const reworkResult = await this.reworkRunner.executeRework(reworkContext)

          // Mark findings as fixed
          for (const finding of fileFindings) {
            finding.status = 'FIXED'
            iteration.findingsAddressed.push(finding.id)
          }

          // Save rework report
          if (reworkResult.reportContent) {
            await this.saveReworkReport(workflow.id, phase.id, iterationNumber, file, reworkResult.reportContent)
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          this.logger.error(`Failed to fix findings in ${file}`, err.message)
          // Continue with other files
        }
      }

      iteration.status = 'completed'
      iteration.completedAt = new Date()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error(`Rework iteration ${iterationNumber} failed`, err.message)
      iteration.status = 'failed'
      iteration.completedAt = new Date()
    }

    return iteration
  }

  private async checkConvergence(
    _workflowId: string,
    _phaseId: string,
    findings: PrioritizedFinding[],
    iterationNumber: number
  ): Promise<{ converged: boolean; reason: string }> {
    // Check 1: All CRITICAL and HIGH findings fixed
    const criticalOrHighRemaining = findings.filter(
      (f) => f.status === 'OPEN' && (f.severity === 'CRITICAL' || f.severity === 'HIGH')
    )

    if (criticalOrHighRemaining.length === 0) {
      return { converged: true, reason: 'All critical and high severity findings fixed' }
    }

    // Check 2: Max iterations reached
    if (iterationNumber >= this.maxIterations) {
      return { converged: true, reason: `Max iterations (${this.maxIterations}) reached` }
    }

    // Check 3: No progress (no findings fixed in last iteration)
    const fixedInLastIteration = findings.filter((f) => f.status === 'FIXED').length
    if (fixedInLastIteration === 0) {
      return { converged: true, reason: 'No progress made in last iteration' }
    }

    // Re-run code review and QA to check for new findings (simplified convergence check)
    // In production, you'd want to compare with previous iteration's findings
    this.logger.info(`Iteration ${iterationNumber} complete, convergence not yet reached`)

    return { converged: false, reason: 'High priority findings still remain' }
  }

  private groupFindingsByFile(findings: PrioritizedFinding[]): Record<string, PrioritizedFinding[]> {
    const grouped: Record<string, PrioritizedFinding[]> = {}

    for (const finding of findings) {
      if (!grouped[finding.file]) {
        grouped[finding.file] = []
      }
      grouped[finding.file].push(finding)
    }

    return grouped
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
    workflow: { organizationId: string; projectId?: string; id: string },
    phase: { key: string }
  ): string {
    const workspacesPath = this.configService.workspace?.workspacesPath || '/tmp/vyrak-workspaces'
    return `${workspacesPath}/${workflow.organizationId}/${workflow.projectId || 'default'}/${workflow.id}/${phase.key}`
  }

  private async saveReworkReport(
    workflowId: string,
    phaseId: string,
    iterationNumber: number,
    file: string,
    reportContent: string
  ): Promise<void> {
    try {
      const sanitizedFileName = file.replace(/[^a-zA-Z0-9-_]/g, '-')
      const artifactKey = `rework-iteration-${iterationNumber}-${sanitizedFileName}`

      await this.artifactService.uploadArtifact(
        workflowId,
        'rework-report',
        artifactKey,
        `Rework Report - Iteration ${iterationNumber} - ${file}`,
        reportContent,
        {
          phaseId,
          metadata: {
            iterationNumber,
            file,
            timestamp: new Date().toISOString(),
          },
        }
      )
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error(`Failed to save rework report for ${file}`, err.message)
    }
  }
}
