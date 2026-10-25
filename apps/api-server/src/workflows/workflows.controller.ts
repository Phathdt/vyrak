import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import {
  ApproveWorkflowUseCase,
  CancelWorkflowUseCase,
  RejectWorkflowUseCase,
  StartWorkflowUseCase,
} from '@vyrak/workflow-core'

import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { OrganizationMemberGuard } from '../guards/organization-member.guard'
import { CurrentUser } from '../organizations/decorators'
import {
  ApprovalDecisionDto,
  CreateWorkflowRunDto,
  ListWorkflowRunsDto,
  PaginatedWorkflowRunsDto,
  WorkflowRunResponseDto,
} from './dto'
import { toWorkflowRunResponseDto } from './mappers/workflow-run.mapper'
import { WorkflowsService } from './workflows.service'

@ApiTags('workflows')
@Controller('api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly startWorkflowUseCase: StartWorkflowUseCase,
    private readonly approveWorkflowUseCase: ApproveWorkflowUseCase,
    private readonly rejectWorkflowUseCase: RejectWorkflowUseCase,
    private readonly cancelWorkflowUseCase: CancelWorkflowUseCase
  ) {}

  /**
   * POST /api/projects/:projectId/workflows/runs
   * Create a new workflow run
   */
  @Post('projects/:projectId/workflows/runs')
  @UseGuards(OrganizationMemberGuard)
  @ApiOperation({
    summary: 'Create a new workflow run',
    description: 'Initiates a new workflow execution with the provided requirements and repository settings',
  })
  @ApiResponse({
    status: 201,
    description: 'Workflow run created successfully',
    type: WorkflowRunResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of the organization' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createWorkflowRun(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateWorkflowRunDto
  ): Promise<WorkflowRunResponseDto> {
    // Get organizationId from project
    const project = await this.workflowsService.getProject(projectId)

    // Start the workflow using the use case
    const run = await this.startWorkflowUseCase.execute({
      organizationId: project.organizationId,
      projectId,
      workflowKey: 'ai-sdlc-workflow',
      workflowVersion: '1.0.0',
      initiatedByUserId: userId,
      idempotencyKey: dto.idempotencyKey,
      input: {
        requirement: dto.requirement,
        repositoryId: dto.repositoryId,
        branch: dto.branch,
      },
    })

    return toWorkflowRunResponseDto(run)
  }

  /**
   * GET /api/workflows/runs/:runId
   * Get workflow run details by ID
   */
  @Get('workflows/runs/:runId')
  @ApiOperation({
    summary: 'Get workflow run details',
    description: 'Retrieves complete details of a specific workflow run',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow run details retrieved successfully',
    type: WorkflowRunResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow run' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async getWorkflowRun(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string
  ): Promise<WorkflowRunResponseDto> {
    const run = await this.workflowsService.getWorkflowRun(runId, userId)
    return toWorkflowRunResponseDto(run)
  }

  /**
   * GET /api/workflows/runs
   * List workflow runs with optional filters
   */
  @Get('workflows/runs')
  @ApiOperation({
    summary: 'List workflow runs',
    description: 'Retrieves a paginated list of workflow runs with optional filters by project and status',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow runs retrieved successfully',
    type: PaginatedWorkflowRunsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listWorkflowRuns(
    @Query() query: ListWorkflowRunsDto,
    @CurrentUser() userId: string
  ): Promise<PaginatedWorkflowRunsDto> {
    return this.workflowsService.listWorkflowRuns(query, userId)
  }

  /**
   * POST /api/workflows/runs/:runId/approve
   * Approve a pending workflow
   */
  @Post('workflows/runs/:runId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a pending workflow',
    description: 'Approves a workflow that is waiting for human approval and resumes execution',
  })
  @ApiResponse({ status: 200, description: 'Workflow approved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid approval state or workflow not in waiting_approval state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no approval permission' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  @ApiResponse({ status: 409, description: 'Approval already decided or plan has been regenerated' })
  async approveWorkflow(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ message: string }> {
    // Get workflow run to extract organizationId and projectId
    const run = await this.workflowsService.getWorkflowRunForApproval(runId, userId)

    await this.approveWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      comment: dto.comment,
    })

    return { message: 'Workflow approved successfully' }
  }

  /**
   * POST /api/workflows/runs/:runId/reject
   * Reject a pending workflow
   */
  @Post('workflows/runs/:runId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a pending workflow',
    description: 'Rejects a workflow that is waiting for human approval and cancels execution',
  })
  @ApiResponse({ status: 200, description: 'Workflow rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rejection state or missing comment' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no approval permission' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  @ApiResponse({ status: 409, description: 'Approval already decided' })
  async rejectWorkflow(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ message: string }> {
    // Validate comment is required for rejection
    if (!dto.comment || dto.comment.trim().length === 0) {
      throw new Error('Rejection comment is required')
    }

    // Get workflow run to extract organizationId and projectId
    const run = await this.workflowsService.getWorkflowRunForApproval(runId, userId)

    await this.rejectWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      comment: dto.comment,
    })

    return { message: 'Workflow rejected successfully' }
  }

  /**
   * POST /api/workflows/runs/:runId/cancel
   * Cancel a running workflow
   */
  @Post('workflows/runs/:runId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a running workflow',
    description: 'Cancels an in-progress workflow execution',
  })
  @ApiResponse({ status: 200, description: 'Workflow cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Workflow cannot be cancelled (already in terminal state)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async cancelWorkflow(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ message: string }> {
    // Get workflow run to extract organizationId and projectId
    const run = await this.workflowsService.getWorkflowRun(runId, userId)

    await this.cancelWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      reason: dto.comment || 'User requested cancellation',
    })

    return { message: 'Workflow cancelled successfully' }
  }
}
