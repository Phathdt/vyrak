import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { IWorkflowPhaseRepository, WORKFLOW_PHASE_REPOSITORY } from '@vyrak/workflow-core'
import {
  IMPLEMENTATION_ORCHESTRATION_SERVICE,
  CODE_REVIEW_SERVICE,
  QA_VERIFICATION_SERVICE,
  REWORK_ORCHESTRATOR_SERVICE,
} from '@vyrak/workflow-execution'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'
import {
  StartImplementationResponseDto,
  ImplementationStatusResponseDto,
  RetryTaskResponseDto,
  StartCodeReviewResponseDto,
  CodeReviewReportResponseDto,
  QAVerificationResponseDto,
  StartReworkResponseDto,
  ReworkStatusResponseDto,
} from './workflow-execution.dto'

// Interface imported from workflow-execution lib
export interface IImplementationOrchestrationService {
  startImplementation(workflowId: string, phaseId: string): Promise<void>
  getStatus(workflowId: string, phaseId: string): Promise<unknown>
  retryTask(taskId: string): Promise<unknown>
}

// Interface for Code Review Service
export interface ICodeReviewService {
  startCodeReview(workflowId: string, phaseId: string): Promise<unknown>
  getReport(workflowId: string, phaseId: string): Promise<unknown>
}

// Interface for QA Verification Service
export interface IQAVerificationService {
  startQA(workflowId: string, phaseId: string): Promise<unknown>
  getQAReport(workflowId: string, phaseId: string): Promise<unknown>
}

// Interface for Rework Orchestrator Service
export interface IReworkOrchestratorService {
  startRework(workflowId: string, phaseId: string): Promise<unknown>
  getReworkStatus(workflowId: string, phaseId: string): Promise<unknown>
}

@ApiTags('Workflows - Execution')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowExecutionController {
  constructor(
    @Inject(IMPLEMENTATION_ORCHESTRATION_SERVICE)
    private readonly orchestrationService: IImplementationOrchestrationService,
    @Inject(CODE_REVIEW_SERVICE)
    private readonly codeReviewService: ICodeReviewService,
    @Inject(QA_VERIFICATION_SERVICE)
    private readonly qaVerificationService: IQAVerificationService,
    @Inject(REWORK_ORCHESTRATOR_SERVICE)
    private readonly reworkOrchestratorService: IReworkOrchestratorService,
    @Inject(WORKFLOW_PHASE_REPOSITORY) private readonly phaseRepository: IWorkflowPhaseRepository
  ) {}

  @Post('implementation/start')
  @ApiOperation({
    summary: 'Start implementation phase execution',
    description:
      'Begins orchestrating sub-task execution with parallel/sequential dependency handling. Independent tasks execute in parallel (max 3 concurrent).',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: StartImplementationResponseDto })
  async startImplementation(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<StartImplementationResponseDto> {
    // Find implementation phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const implementationPhase = phases.find((p) => p.key === 'implementation')

    if (!implementationPhase) {
      throw new Error('Implementation phase not found')
    }

    // Get initial status to count tasks
    const initialStatus = await this.orchestrationService.getStatus(workflowId, implementationPhase.id)

    // Start orchestration (async - does not block)
    // In production, this should be queued as a background job
    this.orchestrationService.startImplementation(workflowId, implementationPhase.id).catch((_error) => {
      console.error('Implementation orchestration failed:', _error)
    })

    return {
      message: 'Implementation orchestration started',
      workflowId,
      phaseId: implementationPhase.id,
      totalTasks: (initialStatus as { totalTasks: number }).totalTasks,
    }
  }

  @Get('implementation/status')
  @ApiOperation({
    summary: 'Get implementation orchestration status',
    description: 'Returns current status of all sub-tasks including completion progress.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: ImplementationStatusResponseDto })
  async getImplementationStatus(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<ImplementationStatusResponseDto> {
    // Find implementation phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const implementationPhase = phases.find((p) => p.key === 'implementation')

    if (!implementationPhase) {
      throw new Error('Implementation phase not found')
    }

    const status = await this.orchestrationService.getStatus(workflowId, implementationPhase.id)

    const statusData = status as {
      workflowId: string
      phaseId: string
      totalTasks: number
      completedTasks: number
      failedTasks: number
      inProgressTasks: number
      pendingTasks: number
      readyTasks: number
      tasks: unknown[]
    }

    return {
      workflowId: statusData.workflowId,
      phaseId: statusData.phaseId,
      totalTasks: statusData.totalTasks,
      completedTasks: statusData.completedTasks,
      failedTasks: statusData.failedTasks,
      inProgressTasks: statusData.inProgressTasks,
      pendingTasks: statusData.pendingTasks,
      readyTasks: statusData.readyTasks,
      tasks: statusData.tasks.map((task: unknown) => {
        const t = task as {
          id: string
          key: string
          title: string
          description: string | null
          status: string
          dependencyType: string
          executionOrder: number
        }
        return {
          id: t.id,
          key: t.key,
          title: t.title,
          description: t.description,
          status: t.status as
            | 'PENDING'
            | 'READY'
            | 'IN_PROGRESS'
            | 'WAITING_DEPENDENCY'
            | 'COMPLETED'
            | 'FAILED'
            | 'BLOCKED',
          dependencyType: t.dependencyType as 'INDEPENDENT' | 'SEQUENTIAL' | 'DEPENDENT',
          executionOrder: t.executionOrder,
        }
      }),
    }
  }

  @Post('implementation/retry/:taskId')
  @ApiOperation({
    summary: 'Retry a specific failed task',
    description: 'Resets task status to READY and re-executes it.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiParam({ name: 'taskId', description: 'Sub-task ID to retry' })
  @ApiResponse({ status: 200, type: RetryTaskResponseDto })
  async retryTask(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') _workflowId: string,
    @Param('taskId') taskId: string
  ): Promise<RetryTaskResponseDto> {
    const result = await this.orchestrationService.retryTask(taskId)

    const resultData = result as {
      taskId: string
      status: string
      artifactId?: string
      error?: string
    }

    return {
      message: 'Task retry completed',
      taskId: resultData.taskId,
      status: resultData.status as 'completed' | 'failed',
      artifactId: resultData.artifactId,
      error: resultData.error,
    }
  }

  @Post('code-review/start')
  @ApiOperation({
    summary: 'Start code review phase execution',
    description:
      'Runs automated code review agent to analyze implementation changes for quality, security, performance, and requirements compliance.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: StartCodeReviewResponseDto })
  async startCodeReview(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<StartCodeReviewResponseDto> {
    // Find code review phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const codeReviewPhase = phases.find((p) => p.key === 'code-review')

    if (!codeReviewPhase) {
      throw new Error('Code Review phase not found')
    }

    // Start code review (async - does not block)
    // In production, this should be queued as a background job
    this.codeReviewService.startCodeReview(workflowId, codeReviewPhase.id).catch((_error) => {
      console.error('Code review failed:', _error)
    })

    return {
      message: 'Code review started',
      workflowId,
      phaseId: codeReviewPhase.id,
    }
  }

  @Get('code-review/report')
  @ApiOperation({
    summary: 'Get code review report',
    description: 'Returns the code review report with findings categorized by severity.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: CodeReviewReportResponseDto })
  async getCodeReviewReport(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<CodeReviewReportResponseDto> {
    // Find code review phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const codeReviewPhase = phases.find((p) => p.key === 'code-review')

    if (!codeReviewPhase) {
      throw new Error('Code Review phase not found')
    }

    const report = await this.codeReviewService.getReport(workflowId, codeReviewPhase.id)

    if (!report) {
      throw new Error('Code review report not found')
    }

    const reportData = report as {
      workflowId: string
      phaseId: string
      reviewedFiles: string[]
      findings: unknown[]
      summary: {
        totalFindings: number
        criticalCount: number
        highCount: number
        mediumCount: number
        lowCount: number
        infoCount: number
      }
      artifactId: string
      completedAt: string
    }

    return {
      workflowId: reportData.workflowId,
      phaseId: reportData.phaseId,
      reviewedFiles: reportData.reviewedFiles,
      findings: reportData.findings.map((f: unknown) => {
        const finding = f as {
          file: string
          line?: number
          severity: string
          category: string
          message: string
          suggestion?: string
        }
        return {
          file: finding.file,
          line: finding.line,
          severity: finding.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
          category: finding.category as 'quality' | 'security' | 'performance' | 'requirements' | 'best-practices',
          message: finding.message,
          suggestion: finding.suggestion,
        }
      }),
      summary: {
        totalFindings: reportData.summary.totalFindings,
        criticalCount: reportData.summary.criticalCount,
        highCount: reportData.summary.highCount,
        mediumCount: reportData.summary.mediumCount,
        lowCount: reportData.summary.lowCount,
        infoCount: reportData.summary.infoCount,
      },
      artifactId: reportData.artifactId,
      completedAt: reportData.completedAt,
    }
  }

  @Post('qa/start')
  @ApiOperation({
    summary: 'Start QA verification',
    description:
      'Runs automated QA verification against PRD acceptance criteria. Tests implementation, verifies edge cases, and generates a QA report.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: QAVerificationResponseDto })
  async startQA(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<QAVerificationResponseDto> {
    // Find QA phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const qaPhase = phases.find((p) => p.key === 'qa')

    if (!qaPhase) {
      throw new Error('QA phase not found')
    }

    // Start QA verification (synchronous for now - returns result)
    const result = await this.qaVerificationService.startQA(workflowId, qaPhase.id)

    const resultData = result as {
      workflowId: string
      phaseId: string
      reportArtifactId: string
      criteriaResults: unknown[]
      overallStatus: string
      executedAt: Date
    }

    return {
      workflowId: resultData.workflowId,
      phaseId: resultData.phaseId,
      reportArtifactId: resultData.reportArtifactId,
      criteriaResults: resultData.criteriaResults.map((c: unknown) => {
        const criterion = c as {
          criterion: string
          status: string
          details?: string
          errorMessage?: string
        }
        return {
          criterion: criterion.criterion,
          status: criterion.status as 'pass' | 'fail' | 'skipped',
          details: criterion.details,
          errorMessage: criterion.errorMessage,
        }
      }),
      overallStatus: resultData.overallStatus as 'passed' | 'failed' | 'partial',
      executedAt: resultData.executedAt.toISOString(),
    }
  }

  @Get('qa/report')
  @ApiOperation({
    summary: 'Get QA verification report',
    description: 'Returns the QA verification report with acceptance criteria results and overall status.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: QAVerificationResponseDto })
  async getQAReport(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<QAVerificationResponseDto> {
    // Find QA phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const qaPhase = phases.find((p) => p.key === 'qa')

    if (!qaPhase) {
      throw new Error('QA phase not found')
    }

    const report = await this.qaVerificationService.getQAReport(workflowId, qaPhase.id)

    if (!report) {
      throw new Error('QA report not found')
    }

    const reportData = report as {
      workflowId: string
      phaseId: string
      reportArtifactId: string
      criteriaResults: unknown[]
      overallStatus: string
      executedAt: string | Date
    }

    return {
      workflowId: reportData.workflowId,
      phaseId: reportData.phaseId,
      reportArtifactId: reportData.reportArtifactId,
      criteriaResults: reportData.criteriaResults.map((c: unknown) => {
        const criterion = c as {
          criterion: string
          status: string
          details?: string
          errorMessage?: string
        }
        return {
          criterion: criterion.criterion,
          status: criterion.status as 'pass' | 'fail' | 'skipped',
          details: criterion.details,
          errorMessage: criterion.errorMessage,
        }
      }),
      overallStatus: reportData.overallStatus as 'passed' | 'failed' | 'partial',
      executedAt:
        typeof reportData.executedAt === 'string' ? reportData.executedAt : reportData.executedAt.toISOString(),
    }
  }

  @Post('rework/start')
  @ApiOperation({
    summary: 'Start rework process',
    description:
      'Initiates intelligent rework to fix findings from code review and QA. Prioritizes CRITICAL > HIGH > QA_FAILURE findings. Max 3 iterations with convergence checking.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: StartReworkResponseDto })
  async startRework(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<StartReworkResponseDto> {
    // Find implementation phase (rework happens during implementation)
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const implementationPhase = phases.find((p) => p.key === 'implementation')

    if (!implementationPhase) {
      throw new Error('Implementation phase not found')
    }

    // Start rework (async - does not block)
    this.reworkOrchestratorService.startRework(workflowId, implementationPhase.id).catch((_error) => {
      console.error('Rework orchestration failed:', _error)
    })

    return {
      message: 'Rework orchestration started',
      workflowId,
      phaseId: implementationPhase.id,
    }
  }

  @Get('rework/status')
  @ApiOperation({
    summary: 'Get rework status',
    description: 'Returns current rework status including iteration count, findings fixed, and convergence state.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: ReworkStatusResponseDto })
  async getReworkStatus(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<ReworkStatusResponseDto> {
    // Find implementation phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const implementationPhase = phases.find((p) => p.key === 'implementation')

    if (!implementationPhase) {
      throw new Error('Implementation phase not found')
    }

    const status = await this.reworkOrchestratorService.getReworkStatus(workflowId, implementationPhase.id)

    if (!status) {
      throw new Error('Rework status not found')
    }

    const statusData = status as {
      workflowId: string
      phaseId: string
      currentIteration: number
      maxIterations: number
      findingsFixed: number
      findingsRemaining: number
      isConverged: boolean
      canContinue: boolean
    }

    return {
      workflowId: statusData.workflowId,
      phaseId: statusData.phaseId,
      currentIteration: statusData.currentIteration,
      maxIterations: statusData.maxIterations,
      findingsFixed: statusData.findingsFixed,
      findingsRemaining: statusData.findingsRemaining,
      isConverged: statusData.isConverged,
      canContinue: statusData.canContinue,
    }
  }
}
