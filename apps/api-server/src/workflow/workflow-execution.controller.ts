import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { WORKFLOW_PHASE_REPOSITORY, type IWorkflowPhaseRepository } from '@vyrak/workflow-core'
import {
  WORKFLOW_EXECUTION_QUERY_SERVICE,
  WorkflowPhaseOrchestratorService,
  type IWorkflowExecutionQueryService,
} from '@vyrak/workflow-execution'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'
import {
  StartImplementationResponseDto,
  ImplementationStatusResponseDto,
  StartCodeReviewResponseDto,
  CodeReviewReportResponseDto,
  StartQAResponseDto,
  QAVerificationResponseDto,
} from './workflow-execution.dto'

@ApiTags('Workflows - Execution')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowExecutionController {
  constructor(
    private readonly phaseOrchestrator: WorkflowPhaseOrchestratorService,
    @Inject(WORKFLOW_EXECUTION_QUERY_SERVICE)
    private readonly executionQuery: IWorkflowExecutionQueryService,
    @Inject(WORKFLOW_PHASE_REPOSITORY) private readonly phaseRepository: IWorkflowPhaseRepository
  ) {}

  @Post('implementation/start')
  @ApiOperation({
    summary: 'Start implementation phase execution',
    description:
      'Enqueues the implementation phase run for the worker and returns immediately. Progress is available from implementation/status.',
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
    const phaseId = await this.findPhaseId(workflowId, 'implementation', 'Implementation')

    await this.phaseOrchestrator.startAutomationForPhase(workflowId, 'implementation')
    const status = await this.executionQuery.getImplementationStatus(workflowId, phaseId)

    return {
      message: 'Implementation job queued',
      workflowId,
      phaseId,
      totalTasks: status.totalTasks,
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
    const phaseId = await this.findPhaseId(workflowId, 'implementation', 'Implementation')

    const status = await this.executionQuery.getImplementationStatus(workflowId, phaseId)

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

  @Post('code-review/start')
  @ApiOperation({
    summary: 'Start code review phase execution',
    description:
      'Enqueues the code review phase run for the worker and returns immediately. The result is available from code-review/report.',
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
    const phaseId = await this.findPhaseId(workflowId, 'code-review', 'Code Review')

    await this.phaseOrchestrator.startAutomationForPhase(workflowId, 'code-review')

    return {
      message: 'Code review job queued',
      workflowId,
      phaseId,
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
    const phaseId = await this.findPhaseId(workflowId, 'code-review', 'Code Review')

    const report = await this.executionQuery.getCodeReviewReport(workflowId, phaseId)

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
      'Enqueues the QA phase run for the worker and returns immediately with status RUNNING. The result is available from qa/report.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: StartQAResponseDto })
  async startQA(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string
  ): Promise<StartQAResponseDto> {
    await this.findPhaseId(workflowId, 'qa', 'QA')

    await this.phaseOrchestrator.startAutomationForPhase(workflowId, 'qa')

    return { status: 'RUNNING' }
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
    const phaseId = await this.findPhaseId(workflowId, 'qa', 'QA')

    const report = await this.executionQuery.getQAReport(workflowId, phaseId)

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

  private async findPhaseId(workflowId: string, phaseKey: string, label: string): Promise<string> {
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const phase = phases.find((p) => p.key === phaseKey)

    if (!phase) {
      throw new Error(`${label} phase not found`)
    }

    return phase.id
  }
}
