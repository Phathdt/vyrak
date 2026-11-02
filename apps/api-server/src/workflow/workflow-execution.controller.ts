import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { IWorkflowPhaseRepository, WORKFLOW_PHASE_REPOSITORY } from '@vyrak/workflow-core'
import {
  IMPLEMENTATION_ORCHESTRATION_SERVICE,
  CODE_REVIEW_SERVICE,
  QA_VERIFICATION_SERVICE,
  type IImplementationOrchestrationService,
  type ICodeReviewService,
  type IQAVerificationService,
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
} from './workflow-execution.dto'

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
      totalTasks: initialStatus.totalTasks,
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

    return {
      workflowId: status.workflowId,
      phaseId: status.phaseId,
      totalTasks: status.totalTasks,
      completedTasks: status.completedTasks,
      failedTasks: status.failedTasks,
      inProgressTasks: status.inProgressTasks,
      pendingTasks: status.pendingTasks,
      readyTasks: status.readyTasks,
      tasks: status.tasks.map((task) => ({
        id: task.id,
        key: task.key,
        title: task.title,
        description: task.description || '',
        status: task.status,
        dependencyType: task.dependencyType,
        executionOrder: task.executionOrder,
      })),
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

    return {
      message: 'Task retry completed',
      taskId: result.taskId,
      status: result.status,
      artifactId: result.artifactId,
      error: result.error,
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

    return {
      workflowId: report.workflowId,
      phaseId: report.phaseId,
      reviewedFiles: report.reviewedFiles,
      findings: report.findings.map((finding) => ({
        file: finding.file,
        line: finding.line,
        severity: finding.severity,
        category: finding.category,
        message: finding.message,
        suggestion: finding.suggestion,
      })),
      summary: {
        totalFindings: report.summary.totalFindings,
        criticalCount: report.summary.criticalCount,
        highCount: report.summary.highCount,
        mediumCount: report.summary.mediumCount,
        lowCount: report.summary.lowCount,
        infoCount: report.summary.infoCount,
      },
      artifactId: report.artifactId,
      completedAt: report.completedAt.toISOString(),
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

    return {
      workflowId: result.workflowId,
      phaseId: result.phaseId,
      reportArtifactId: result.reportArtifactId,
      criteriaResults: result.criteriaResults.map((criterion) => ({
        criterion: criterion.criterion,
        status: criterion.status,
        details: criterion.details,
        errorMessage: criterion.errorMessage,
      })),
      overallStatus: result.overallStatus,
      executedAt: result.executedAt.toISOString(),
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

    return {
      workflowId: report.workflowId,
      phaseId: report.phaseId,
      reportArtifactId: report.reportArtifactId,
      criteriaResults: report.criteriaResults.map((criterion) => ({
        criterion: criterion.criterion,
        status: criterion.status,
        details: criterion.details,
        errorMessage: criterion.errorMessage,
      })),
      overallStatus: report.overallStatus,
      executedAt: report.executedAt.toISOString(),
    }
  }
}
